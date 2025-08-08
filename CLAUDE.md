# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is Beatrider, a game that synchronizes gameplay with Spotify music beats. The project consists of:
- A single-page web application (`index.html`) that combines Spotify Web API integration with a Phaser.js game
- Uses Spotify's audio analysis API to extract beat timings from tracks
- Implements PKCE OAuth flow for secure Spotify authentication
- Features a 5-lane space shooter game where enemies spawn on musical beats

## Development Commands

Since this is a single HTML file application with no build process:
- **Run locally**: Use a local web server (e.g., `python -m http.server 8000` or `npx http-server`)
- **Test**: Open in browser at `http://127.0.0.1:[port]` (HTTPS or localhost required for Spotify SDK)

## Architecture & Key Components

### Spotify Integration
- **Authentication**: PKCE OAuth flow implementation (lines 75-158 in index.html)
- **Web Playback SDK**: Device creation and playback control (lines 189-205)
- **Audio Analysis**: Beat extraction from Spotify tracks (lines 236-245)
- **Beat Scheduler**: Synchronizes game events with music beats using lookahead scheduling (lines 248-264)

### Game Engine
- **Phaser.js**: 5-lane shooter game (lines 275-318)
- **GameAPI Interface**: `window.GameAPI` provides `onBeat()` callback for music-synchronized spawning
- **Manual Controls**: Arrow keys/A/D for lane movement, Space to shoot

### Important Constraints
- Requires Spotify Premium account for playback functionality
- Must run on HTTPS or localhost/127.0.0.1 due to Spotify SDK requirements
- Spotify Client ID must be configured in the app's dashboard with correct redirect URI
- Calibration offset can be adjusted via UI to sync visual/audio timing

## External Dependencies
- Phaser.js v3 (CDN)
- Spotify Web Playback SDK (CDN)
- No build tools or package management required