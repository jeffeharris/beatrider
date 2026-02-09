# Refactoring the Monolith

**Draft for blog post - February 2026**

---

## The Experiment

Six months ago I [built Beatrider in about a week](arguing-software-into-existence.html) without opening an IDE. I argued the result -- 8,000 lines of AI-generated code in a single HTML file -- was disposable software. Cheaper to rebuild than refactor.

I still pull it up when I'm waiting in line at the pharmacy or have five minutes to kill. It's a fun little thing. But 8,360 lines in one file makes it hard to touch without breaking something, and I was curious: how far has the tooling come in six months?

The question wasn't "does this need refactoring?" It was: **can Claude Code's [Agent Teams](https://code.claude.com/docs/en/agent-teams) and Opus 4.6 take an AI-generated monolith and decompose it into proper modules?** How good are the out-of-the-box models and frameworks at a real restructuring task, not a greenfield build?

## What Agent Teams Are

Claude Code recently shipped [Agent Teams](https://code.claude.com/docs/en/agent-teams) as an experimental feature. Instead of one AI session doing everything sequentially, you spin up a team: a lead agent that coordinates work, and teammates that each get their own context window, their own task list, and can message each other directly.

The key insight: unlike subagents (which do focused work and report back), teammates operate independently. They can explore different parts of a codebase in parallel without stepping on each other. The docs describe it well -- agent teams are strongest for "new modules or features" where "teammates can each own a separate piece."

That's exactly what a monolith decomposition is.

## The Monolith

One HTML file. 8,360 lines. Everything inside a single `<script>` tag:

- 500 lines of CSS
- 155 lines of storage/persistence
- 1,400 lines of music synthesis (Tone.js instruments, patterns, sequencing)
- 600 lines of music UI (sliders, genre buttons, settings panel)
- 160 lines of game sound effects
- 285 lines of game config and constants
- 500 lines for the start screen
- **5,000 lines for the main gameplay scene**
- 90 lines of Phaser initialization

Natural seams everywhere. Perfect candidate.

## Sending in the Team

I set up an agent team with three teammates working in parallel:

- **sounds-fixer**: Fix the game sound effects module's broken export pattern
- **scene-extractor**: Pull out the massive 5,000-line gameplay scene, converting ~150 global variable references to ES module imports
- **entrypoint-creator**: Build the new HTML shell and Phaser initialization module

Earlier in the session, Claude (Opus 4.6) had already extracted the simpler leaf modules -- storage, config, audio engine, music UI, CSS. Those went cleanly because they had fewer dependencies. The agent team tackled the hard remaining pieces: the files with deep coupling and cross-module dependencies.

Three agents, three files, one monolith being carved up simultaneously. The whole team extraction took about 15 minutes of wall clock time.

## The Experience

What struck me was how *mechanical* the process felt. Not in a bad way -- in a "this is exactly what AI should be doing" way.

The scene-extractor agent read 5,000 lines of monolith code, identified every bare global variable reference (`WIDTH`, `HEIGHT`, `PLAYER_Y`, `gridEnabled`, `currentBar`... about 50 different variables), and converted each one to the correct ES module import pattern. Some were simple constant imports. Others were mutable state that needed getter/setter wrappers because you can't reassign imported bindings in ES modules. The agent handled the distinction automatically across 150+ replacements.

The entrypoint-creator read the monolith's initialization code and HTML structure, then produced a clean 135-line entry point and a 170-line HTML shell. Faithful reproduction of the original logic, just properly separated.

The sounds-fixer diagnosed that one module exported a factory function while another module expected a direct named export, and wired them together correctly.

Build passes. 977 modules resolved. The module graph works.

## Where It Got Interesting

The bugs weren't in any individual module -- each agent's output was internally correct. The bugs lived at the *boundaries* between modules, where agents had made slightly different assumptions about how their pieces connect.

The audio library worked differently as an ES module import than it did as a CDN global. Code that initialized at import time now ran before the browser allowed audio. One agent's export didn't match another agent's import. These are the classic integration problems of any modular system, just surfaced in a single afternoon instead of over weeks of development.

This is where [OpenAI's Codex](https://openai.com/index/introducing-codex/) (running GPT 5.3) earned its keep. After the agent team completed the structural extraction, I used Codex for code review and targeted bug fixes on the integrated result. Different tool, different strength: Codex was good at reading the full module graph and spotting the cross-boundary issues that individual agents had missed during parallel work. It fixed the audio initialization timing, patched the transport scheduling, and cleaned up a few module interface mismatches.

## The Numbers

| Before | After |
|--------|-------|
| 1 file, 8,360 lines | 12 ES modules |
| No build step | Vite, 8-second production build |
| CDN script tags | npm packages, tree-shaking |
| Ctrl+F to navigate | Import graph, IDE navigation |
| 298KB single payload | 4 chunks: Phaser (340KB gz), Tone (52KB gz), app (30KB gz), vendors (30KB gz) |

Total time from "let's try this" to passing build: **about an hour**, including setup, extraction, debugging, and the Codex review pass. The original game took a week to build.

## What This Says About the Tooling

**Opus 4.6 is genuinely good at mechanical code transformation.** Reading thousands of lines, identifying patterns, applying consistent replacements -- this is tedious, error-prone work for humans and exactly the kind of task where AI shines. I would have made more mistakes doing this by hand, and it would have taken days.

**Agent Teams work for decomposition.** The monolith had natural seams, and the team structure mapped cleanly onto them. Each agent owned a separate file, no conflicts. The [docs recommend](https://code.claude.com/docs/en/agent-teams) avoiding two agents editing the same file, and for this task that was easy to respect.

**The boundaries are still the hard part.** Individual modules were correct. Integration wasn't. This mirrors the classic software engineering truth: the interfaces between components are harder than the components themselves. Giving each agent explicit interface specs (what to import, what to export) rather than letting them infer it would have caught some issues earlier.

**Multiple models, multiple strengths.** Opus 4.6 excelled at the parallel extraction -- fast, mechanical, faithful to the source. Codex 5.3 excelled at the review pass -- reading across module boundaries, spotting integration issues, making targeted fixes. Using both felt natural, like having a build crew and then a code reviewer.

## The Bigger Picture

Six months ago I argued that AI makes software disposable. I still think that's true for prototypes and MVPs. But the more interesting question is what happens when the tooling gets good enough that refactoring is *also* cheap.

If you can build it in a week and refactor it in an hour, the calculus changes. You don't have to choose between "disposable" and "maintainable." You can start disposable, ship fast, and add structure later -- when and if you need it -- because the cost of restructuring has dropped by an order of magnitude.

The monolith is dead. Long live the modules.

---

*Beatrider is playable at [thebeatrider.com/play](https://thebeatrider.com/play). Source code on [GitHub](https://github.com/jeffeharris/beatrider). It's now 12 modules of AI-generated code. Progress.*
