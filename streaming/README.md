# BLW Kenya Zone self-hosted livestream

This directory provides a self-host-ready livestream path:

`LiveKit Egress -> RTMP -> MediaMTX -> HLS -> BLW Live page`

## Local MediaMTX

From the repository root:

```bash
cd streaming
docker compose up -d
```

MediaMTX listens for RTMP publishers on port `1935` and serves HLS on port `8888`.

The local endpoints are:

```text
RTMP ingest: rtmp://YOUR_COMPUTER_IP:1935/live
HLS playback: http://YOUR_COMPUTER_IP:8888/live/index.m3u8
```

### Important for LiveKit Cloud

A LiveKit Cloud Egress worker cannot reach a private/local address such as `localhost`, `127.0.0.1`, or a LAN-only IP. To test the complete `LiveKit Cloud -> MediaMTX` path, MediaMTX must be reachable from the public internet. For a zero-cost development test, expose the local RTMP service through a secure tunnel that supports long-lived TCP/RTMP traffic, or run both LiveKit and MediaMTX locally instead.

For production, run MediaMTX on a public server, put HLS behind HTTPS, and use a dedicated hostname such as:

```text
https://live.example.org/live/index.m3u8
```

## Cloudflare Worker configuration

The Worker starts LiveKit Egress and sends the resulting RTMP stream to the configured destination. Configure these as Cloudflare Worker secrets; never commit their values:

```text
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
LIVEKIT_RTMP_URL
LIVEKIT_PUBLIC_PLAYBACK_URL
```

Example production values:

```text
LIVEKIT_RTMP_URL=rtmp://stream.example.org:1935/live
LIVEKIT_PUBLIC_PLAYBACK_URL=https://live.example.org/live/index.m3u8
```

`LIVEKIT_PUBLIC_PLAYBACK_URL` is returned by the broadcast-start endpoint and consumed by the BLW Live page.

## Security

Do not commit LiveKit API secrets, RTMP credentials, private keys, or other production secrets to this directory. The Cloudflare Worker remains responsible for authentication and LiveKit room/egress control; MediaMTX is the video ingest/playback service.
