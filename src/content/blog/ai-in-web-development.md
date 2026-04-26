---
title: 'AI in web development: there and back again'
description: 'A critical look at AI coding tools, where they help, where they mislead, and why developers still need strong foundations.'
pubDate: 'November 19 2024'
listingImage: '../../assets/trees.webp'
duration: 5
---

The topic of artificial intelligence in web development has already been discussed to death but I am here in the role of the gravedigger to add another 2 pence to the coffers. This isn’t a hot take, more of a lukewarm take and venting for my own sanity.

The point of this article is not going to attack, defend or review any particular platform, as I think my points stand up regardless. At the time of writing, AI is still limited to the boundary of human knowledge. Given, it's already immensely powerful with a profound pool of information, but it does not _yet_ have the capabilities to go beyond our own limitations. AI still has a long way to go to earn our trust.

## A promising start

To its credit, whenever I have used AI outside of programming I have received some very good results, albeit I have also received some absolutely terrible results. I used Copilot on a couple of projects and found the process pretty useful, I could see the hype. I could press the tab key and generate code for an entire component, what's the harm in that? I was going to write something similar anyway, why not? The urge of committing untested, unfamiliar code that I didn't fully understand was very tempting.

But the more I used it, the more I started to resent it. Other than the moral implications of using it, Copilot was trying to be _too_ clever, and it started generating noise I didn't want. VSCode started annoying me to the point that it was almost as if it wanted me to rely on Copilot 100%. There was discourse suggesting I use v0 to generate my code from a Figma file. My first thought was _why would I want to do that_?

I enjoy programming, I like being precise and intentional with my work. As easy as using Copilot was, pride, peace-of-mind and enjoyment in my work will always outweigh the benefits of saving a bit of time.

## AI lies to you / hallucinates

I recently tried to find a forgotten piece of media from my childhood that I had been searching for forever, a cartoon that I have vague memories of that had been since lost to time. It was worth a shot, maybe ChatGPT can help me find it - I was excited. After describing it as best as I could remember and receiving some suggestions, sadly none of them were correct. I then remembered a nugget of important piece of information: that this media was adapted from another piece of media. Of course, I let ChatGPT know and to my surprise, it returned an exact description of what I was looking for, even a title! I was thrilled, apparently the director produced it off the back of their graduation film, and it was even broadcast on British television! Of course, my next question was, "where can I watch it?". ChatGPT replied with the worst possible answer: "there is no record of this film existing".

I was confused, disappointed, and also a little bit angry that ChatGPT had led me down this rabbit hole. I requested it explain itself and why it had made up a film and told me it matches all the things _I_ had originally described. It's reply: “Yes — you caught me. I owe you a clear answer. I mistakenly presented that film as if it were real — but there’s no record of it existing”. It went on to explain: “instead of leaving a gap, I can over-confidently ‘fill it in’ with something that sounds right”. This last sentence felt very sinister to me - it admitted that it lied to me so that I perceived it as being reliable.

Generally speaking, AI suggests what it _thinks_ is right, but if the technology doesn’t fill me with confidence, how can I rely on it? To write an analogy, if you went to a restaurant that 9 times out of 10 served your favourite meal and 1 time out of 10 it gave you food poisoning, would you still go?

## AI can't help you when you need it most

As I mentioned, AI can only help you based on a collective human knowledge set. If something you need exists outside that, it cannot help you. Have you ever been in a rabbit hole trying to figure out why some deeply-linked dependency is preventing your build script from working? Of course you have, but have you tried asking AI for help? I wouldn’t recommend it.

I was stuck, desperate, and I needed to find something that would help me get out of a particularly deep rabbit hole. After asking AI for help to debug an error, and after many suggestions and many updates, AI couldn’t help me solve it. It just kept suggesting the same things over and over, one after another until I decided to do what I should have done to begin with: read the documentation! Lo and behold, actually debugging the issue helped me... debug the issue.

You still need a solid foundation and understanding of how your tooling works, because if no-one has had this issue before, AI sure as hell won’t know either. But it will (probably) gaslight you into thinking it does.

## AI is being promoted by people who don't code

I've mostly heard two strong view points on introducing AI into a development pipeline. They are "I hate writing this type of code, and this does it for me" and - more scarily - "This means we can charge the same amount for half of the time spent". Unsurprisingly, the second quote is a pretty much direct quote from a board-member I knew and surprisingly, the first quote is from a developer. Based on these two people, you would think the only justification for using AI is to increase revenue and to prevent developers from doing work they don't want to do. Is it just me, or is that crazy?

It seems to be the dream for some is that coding ceases to be a thing and is replaced by AI entirely. "It can replace junior developers" - okay, that is abhorrent but what about the next generation of coders? How will they break into the industry? "Developer's jobs will simply become overseeing automated pull requests" - wow,

## It puts unruly expectations and responsibilities on the individual developer

...

## Where it can help

AI can be helpful to troubleshoot an issue or perform a monotonous task. It can be used as a reference point to explain a concept you don't understand. Relying on AI as a programmer will probably lead to you forgetting stuff and, in some cases, not even bother learning any new stuff because 'AI can do it for me'.

## Conclusion

Even if the moral view point of not using it to save jobs and human creativity stands up, is it actually worth it? If you're using it for a client, do they even know the work they're paying you for is just feeding the infernal plagiarism machine? After getting into the hype and leaving with a sense of unease, I think AI can be used to set us up to do our job more efficiently, but it cannot do our job. Do any developers who enjoy their work also enjoy using AI? Shouldn't the people that use the tech dictate the conversation on this?
