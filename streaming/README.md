# BLW Kenya Zone self-hosted livestream

This directory provides a zero-cost local development setup for the planned self-hosted livestream path:

`LiveKit Egress -> RTMP -> MediaMTX -> HLS -> BLW Live page`

## Local start

From the repository root:

```bash
cd streaming
docker compose up -d
```

MediaMTX will listen for RTMP publishers on port `1935` and serve HLS on port `8888`.

For a local test destination, configure the LiveKit RTMP output as:

```text
rtmp://YOUR_COMPUTER_IP:1935/live
```

The corresponding HLS playlist is:

```text
http://YOUR_COMPUTER_IP:8888/live/index.m3u8
```

A browser normally needs HTTPS for production playback. For production, put MediaMTX behind TLS/reverse proxy and use a dedicated streaming hostname.

## Important

Do not commit LiveKit API secrets, stream credentials, or private keys to this directory.

The Cloudflare Worker remains responsible for authentication and LiveKit room/egress control. MediaMTX is only the video ingest/playback service.
