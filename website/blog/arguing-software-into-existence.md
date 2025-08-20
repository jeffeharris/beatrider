# Arguing Software Into Existence

*90% frustration, 10% success, 100% shipped. What happens when you refuse to open an IDE and let AI write everything?*

*"Let there be code." And there was code. And it was... complicated.*

![Beatrider Gameplay](../website/images/beatrider-gameplay.gif)

## The Constraint

Never open an IDE. Never write code. Build a complete game using only natural language.

This wasn't about proving AI can replace developers. It was about understanding the limits and experiencing what Sam Altman calls "fast fashion of SaaS" - disposable software built quickly, used, then discarded. 

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">entering the fast fashion era of SaaS very soon</p>&mdash; Sam Altman (@sama) <a href="https://twitter.com/sama/status/1952084574366032354?ref_src=twsrc%5Etfw">August 3, 2025</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

The gap between "I have an idea" and "it exists in the world" is shrinking to almost nothing.

## Day 1: The Spotify API That Never Was

Me: "Can we sync enemy spawning to the beats in a user's Spotify songs?"

Claude Code: "Absolutely! Spotify's Web API provides beat analysis with timing markers..."

Claude then mocked up beautiful API responses, built an entire working OAuth flow, and created beat detection logic around an [API that had been deprecated](https://developer.spotify.com/documentation/web-api/reference/get-audio-analysis) for over a year. Its training data was outdated, but it was so confident I didn't question it for the better part of a day.

<div style="text-align: center;">
<img src="../website/images/deprecated-api.png" alt="Spotify deprecated API notice" style="width: 66%; max-width: 600px;">
</div>

**Lesson 1:** AI operates on old data but with complete confidence. As Andrej Karpathy points out, we need tight generate-verify loops. I had generation without verification.

**Lesson 2:** Vibes lead to discovery. This hiccup led me to ask a new question, "Can we generate the beats in the browser". And that led to an incredibly quick implementation of Tone.js , a library I had no familiarity with until this project and is now the backbone of the game/music engine.

By the end of Day 1 I had a working prototype despite the Spotify side quest.

<div style="text-align: center;">
<img src="../website/images/music-engine.png" alt="Music Engine Controls" style="width: 66%; max-width: 600px;">
</div>

## The Amelia Bedelia Problem

Working with Claude felt like instructing Amelia Bedelia, it would take my requests extremely literally and I often had to pull it back from over-engineering. I had to intervene and steer the agent many times during the project when it was using complex algorithms to solve simple problems or overlooking parts of the code that had already been written.

At times, sticking to the constraint of not using an editor became a pain; "Change the font size" likely used more compute than cracking Enigma (I didn't ask Claude to do the math on that).

The AI can implement complex game mechanics and an in-browser progressively generated music engine in minutes but can't understand that "up" means "toward the top of the screen."

And, "Draw a line from A to B" became 600 lines of 3D projection math.

<div style="text-align: center;">
<img src="../website/images/amelia-beclaudia.png" alt="Amelia Bedelia Claude" style="width: 66%; max-width: 600px;">
</div>

## The Arc Shot Saga

**What I wanted:** Bullets that arc from player to target when jumping.

**What Claude built:** 600 lines of physics simulation with parabolic trajectories and perspective math. 

**The actual solution:** 4 lines of linear interpolation: `y = a + (b - a) * t`

Claude struggled deeply with spatial reasoning, and probably because I'm unable to adequately describe what I want in a way that a language model can make any sense of. It's trying hard to please but often missing the mark.

<div style="display: flex; justify-content: center; gap: 10px; margin: 20px 0;">
<img src="../website/images/arc-shot-01-big-drop.png" alt="Arc shot: big drop" style="height: 200px; width: auto;">
<img src="../website/images/arc-shot-02-big-spike.png" alt="Arc shot: big spike" style="height: 200px; width: auto;">
<img src="../website/images/arc-shot-03-getting closer.png" alt="Arc shot: getting closer" style="height: 200px; width: auto;">
</div>

Even enabling it with Playwright, an MCP server that allowed it to browse and take screenshots of the game, didn't really make a significant improvement for the quick frame rate interactions that we're looking for in a game.

## Disposable Software as a Feature

Beatrider is 8,000 lines in a single HTML file. Unmaintainable spaghetti code.

The game works. It took 10 days without writing code. Major changes? I'd rebuild in 3 days. This is Altman's "fast fashion" - software cheaper to rebuild than refactor. When was the last time you mended a sweater or patched a pair of jeans?

## The Unicorn That Broke Everything

My son wanted to play as his favorite unicorn blanket. 

<div style="text-align: center;">
<img src="../website/images/unicorn-sketch.png" alt="Unicorn sketch" style="width: 66%; max-width: 600px;"> 
</div>

Building the unicorn to my son's delight: 1 hour.

<div style="text-align: center;">
<img src="../website/images/unicorn-closeup.gif" alt="Unicorn sprite" style="width: 66%; max-width: 600px;"> 
</div>

Integrating the unicorn into the 8,000-line HTML file: unknown. The code was too tangled for even Claude to merge.

But here's the thing: **it doesn't matter.**

<div style="text-align: center;">
<img src="../website/images/unicorn-gameplay.gif" alt="Unicorn Gameplay" style="width: 66%; max-width: 600px;">
</div>

I forked the game and now my son has his own version, hosted on GitHub pages for free that includes the Unicorn. It doesn't have my Google Analytics or game saving settings but he doesn't need that to have fun with his space unicorn.

Maybe it's not throw away code after all?

## The Generate-Verify Loop Problem

Karpathy nailed it: I had generation without verification. Claude confidently generated solutions I'd accept. Only when testing did I find that:

- The Spotify API we wanted to use was deprecated last year  
- The physics math solved the wrong problem  
- The spatial reasoning was backwards

Claude is an overconfident sycophant that never says "I'm not sure." and rarely checks to verify it understands your requests.

## Multi-AI Orchestration

Most of the agents I used were instances of Claude Code. Controlling the context, attention, and scope for each agent was key to making iterative progress. During the project I used AI agents in several ways:

- Running a plan > design > implement > validate loop with different agent contexts and personas
- Planning one feature while fixing a bugs in another branch 
- DevOps Agent with Perplexity Comet Assistant configuring GitHub Pages/DNS setup  
- Research for this blog through another Claude Code session in a meta-analysis of Beatrider coding sessions

My real job was translation: turning errors and vision into prompts the AI could act on. I was the orchestrator, deciding what to share between AIs, how to frame problems, what to prioritize, and even making some technical and system design calls. 

## 90% Frustration, 10% Success

Claude's meta-analysis of the project: 90% frustration, 10% success.

That was an accurate feeling, but I'd conjecture that is normal for software development. The difference? I shipped a working game in 10 days without knowing how to code games.

## What This Means

1. Non-developers can ship real products  
2. Disposable software becomes normal  
3. AI desperately needs spatial reasoning  
4. Verification is required in AI code generation  
5. Orchestration skills > coding skills

Next time? Verify everything. Use screenshots from day one. Accept it's disposable.

But honestly, the mess is part of the process. Shipped beats perfect.

## The Bottom Line

I built and shipped a game without writing code. It's janky, unmaintainable, and players don't care.

This isn't the future of all software development. But for prototypes, MVPs, and experiments? For software that needs to exist quickly and serve a specific purpose? This is absolutely the future.

The question isn't "Can AI replace developers?" It's "What becomes possible when non-developers can ship?"

This new category of disposable software opens up possibilities like:

*"I need a tool for this specific wedding next week"*  
*"My team needs a dashboard for just this quarter's project"*  
*"My kid wants to play their game idea TODAY"*

The traditional software response would be "that's not worth building." Now it is, because building costs almost nothing except patience with an overly literal AI assistant.  
It's not replacing "real" software development any more than TikTok replaced cinema.

It's just... new. And yeah, kind of fun in its absolute commitment to shipping over perfection.

---

*Beatrider is playable at [play.thebeatrider.com](https://play.thebeatrider.com). Source code on [GitHub](https://github.com/jeffeharris/beatrider). It's 8,000 lines of AI-generated spaghetti code in a single HTML file. It's also fun.*
