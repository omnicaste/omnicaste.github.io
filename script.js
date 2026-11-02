document.addEventListener("DOMContentLoaded", () => {
    // Hardcoded M3U Playlist Link
    const BUILTIN_PLAYLIST_URL = "https://iptv-org.github.io/iptv/index.m3u";

    const video = document.getElementById("video-player");
    const searchInput = document.getElementById("search-input");
    const channelList = document.getElementById("channel-list");
    const nowPlayingTitle = document.getElementById("now-playing-title");
    const statusMessage = document.getElementById("status-message");

    let channels = [];
    let hls = null;

    // Automatically load built-in playlist on page launch
    loadBuiltinPlaylist();

    function loadBuiltinPlaylist() {
        fetch(BUILTIN_PLAYLIST_URL)
            .then(res => {
                if (!res.ok) throw new Error("Network response was not ok");
                return res.text();
            })
            .then(data => {
                parseM3U(data);
            })
            .catch(err => {
                statusMessage.textContent = "Error loading playlist.";
                channelList.innerHTML = '<li class="placeholder-text">Failed to fetch built-in channels.</li>';
                console.error("Playlist fetch failed:", err);
            });
    }

    // Parse M3U content format
    function parseM3U(content) {
        const lines = content.split("\n");
        channels = [];
        let currentChannel = null;

        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith("#EXTINF:")) {
                const infoParts = line.split(",");
                const title = infoParts.slice(1).join(",").trim() || "Unknown Channel";
                currentChannel = { name: title };
            } else if (line && !line.startsWith("#")) {
                if (currentChannel) {
                    currentChannel.url = line;
                    channels.push(currentChannel);
                    currentChannel = null;
                } else {
                    channels.push({ name: line.split("/").pop(), url: line });
                }
            }
        });

        if (channels.length > 0) {
            statusMessage.textContent = `Loaded ${channels.length} channels`;
            searchInput.disabled = false;
            renderChannelList(channels);
        } else {
            statusMessage.textContent = "No channels found.";
            channelList.innerHTML = '<li class="placeholder-text">No channels available.</li>';
        }
    }

    // Render channels list to sidebar
    function renderChannelList(list) {
        channelList.innerHTML = "";
        if (list.length === 0) {
            channelList.innerHTML = '<li class="placeholder-text">No matching channels found.</li>';
            return;
        }

        list.forEach((channel) => {
            const li = document.createElement("li");
            li.textContent = channel.name;
            li.addEventListener("click", () => playChannel(channel, li));
            channelList.appendChild(li);
        });
    }

    // Live search filter
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = channels.filter(ch => ch.name.toLowerCase().includes(query));
        renderChannelList(filtered);
    });

    // Handle stream playback
    function playChannel(channel, element) {
        document.querySelectorAll("#channel-list li").forEach(li => li.classList.remove("active"));
        if (element) element.classList.add("active");

        nowPlayingTitle.textContent = `Playing: ${channel.name}`;

        if (Hls.isSupported() && channel.url.includes(".m3u8")) {
            if (hls) hls.destroy();
            hls = new Hls();
            hls.loadSource(channel.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = channel.url;
            video.addEventListener("loadedmetadata", () => video.play());
        } else {
            video.src = channel.url;
            video.play().catch(err => console.log("Playback error:", err));
        }
    }
});