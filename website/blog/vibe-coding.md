# Vibe Coding - Building Without a Plan

I started BeatRider with this message to Claude: "Can you help me get this running on a local webserver?"

No design doc. No architecture diagram. No user stories. Just vibes.

## The Non-Plan Plan

Here's everything I knew when I started:
- It should be a game
- Music should be involved somehow
- It should work in a browser

That's it. That was the spec.

Most development advice says this is wrong. You need requirements. You need mockups. You need to know what you're building before you build it.

But here's what actually happened:

```
Day 1: "Let's make something move on screen"
Day 2: "What if it moved to a beat?"
Day 3: "The beat should come from music we generate"
Day 4: "Players should shoot things"
Day 5: "What if shooting was also musical?"
Day 6: "Jump mechanic would be cool"
Day 7: "Arc shots from jumps?"
Day 10: "Ship it"
```

Each day's work was a response to what existed, not a plan that was written.

## Why This Actually Works (Sometimes)

### The Feedback Loop Is Everything

When you're vibe coding with AI, the cycle looks like this:

```
You: "Make it do X"
AI: [Implements X]
You: "Actually, seeing it now, what if Y?"
AI: [Pivots to Y]
You: "That's interesting, but now Z makes more sense"
AI: [Builds Z]
```

This only works when the feedback loop is instant. No pull requests. No code reviews. No deployment pipeline. Just refresh and react.

### AI Doesn't Judge Pivots

Me, Day 4: "Actually, delete everything with the Spotify API"

Claude: "Okay, deleted. What should we build instead?"

No sunk cost fallacy. No attachment to previous work. No "but we spent so much time on this." Just immediate pivot to the next idea.

A human collaborator might resist. An AI just adapts.

### Discovery Through Making

The arc shot feature came from a bug. Enemies were spawning in the wrong place when the player jumped. Instead of fixing it, I asked: "What if bullets could arc?"

The music genres emerged because one BPM got boring during testing. "Can we add variety?" led to five different musical styles, each with unique gameplay.

The neon aesthetic? That's just what triangles look like with glow effects when you can't load image assets.

You can't plan discoveries. You can only create conditions where they might happen.

## The Dark Side of Vibes

Let's be honest about when this doesn't work:

**No North Star** - I almost built a Spotify integration, OAuth system, and social features before remembering I just wanted to make a game. Vibes can lead you completely off course.

**Infinite Scope Creep** - "What if we added..." is dangerous when there's no plan saying "no." BeatRider could have become a music creation tool, a rhythm game, a social platform. It's only a game because I ran out of energy.

**Quality Varies Wildly** - Some parts of the code are elegant (the music system). Others are held together with hope (the arc shot math). Without a plan, quality depends entirely on the moment's inspiration.

**You Can't Estimate Anything** - "When will it be done?" I don't know. "What features will it have?" I'll know when I see them. Try explaining that to a client or manager.

## When to Vibe Code

✅ **Personal projects** - When the journey matters more than the destination

✅ **Prototypes** - When you're trying to find the fun, not implement a spec

✅ **Learning** - When understanding comes from doing, not planning

✅ **Creative work** - When the best idea will emerge, not be designed

❌ **Team projects** - Other people need to know what you're building

❌ **Client work** - Someone is paying for specific outcomes

❌ **Critical systems** - "Let's see what happens" isn't acceptable for payment processing

❌ **Maintenance** - Vibes don't fix bugs systematically

## The Hybrid Approach

What I'm learning is that pure vibe coding is rare. Even BeatRider had micro-plans:

- "Fix the arc shot bug" (specific goal)
- "Make enemies spawn on beat" (clear target)
- "Add mobile support" (defined scope)

The vibes set the direction. Mini-plans handled the execution.

## The Real Secret

Vibe coding isn't about having no plan. It's about being comfortable not knowing the plan yet.

It's replacing "What are we building?" with "What could this become?"

It's accepting that the thing you build might not be the thing you thought you were building.

And sometimes—not always, not even often, but sometimes—what emerges is better than what you would have planned.

## The Code Philosophy

```javascript
// Traditional development
const plan = createDetailedSpec();
const result = implementPlan(plan);
validateAgainstSpec(result, plan);

// Vibe coding
while (!feelsDone()) {
  const idea = whatIfWeTried();
  const result = quickImplementation(idea);
  
  if (makesMeSmile(result)) {
    keep(result);
  } else {
    trySomethingElse();
  }
}
```

Neither is right or wrong. They're tools for different jobs.

## Looking Back

BeatRider exists because I didn't know what I was building. Each feature is a response to what came before, not part of a grand design.

The music system exists because Spotify's API didn't work out.
The arc shots exist because of a positioning bug.
The neon aesthetic exists because we couldn't load images.
The single-file architecture exists because I was too lazy to set up a build system.

Would planning have made a better game? Maybe. Probably. But it wouldn't have made *this* game. And this game—weird, imperfect, discovered through iteration—is the one that got built.

Sometimes the best plan is admitting you don't have one.