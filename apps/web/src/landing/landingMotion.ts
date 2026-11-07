// The landing page's scroll motion, with GSAP. Loaded after the page is idle, so it never delays
// the first paint, and skipped entirely under reduced motion: every element is already visible
// and final in the HTML, so the page reads the same without it.
//
// Markup hooks (set in Landing.tsx):
//   data-reveal          rises and fades in once, when scrolled into view
//   data-steps           the five steps play in order, with the line between them drawing across
//   data-parallax="24"   drifts up to that many pixels while its section scrolls past (768 px and up)
//   data-count-to="32"   counts up to its number when it comes into view
import { DISTANCE, DURATION, EASE, STAGGER } from "../ui/motion";

export async function startLandingMotion(root: HTMLElement): Promise<() => void> {
  const [{ gsap }, { ScrollTrigger }, { CustomEase }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
    import("gsap/CustomEase"),
  ]);
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  // The same curves as the rest of the app.
  const enter = CustomEase.create("bb-enter", EASE.enter.join(","));
  const emphasized = CustomEase.create("bb-emphasized", EASE.emphasized.join(","));

  const media = gsap.matchMedia();
  media.add(
    { motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 768px)" },
    (context) => {
      const { motion, wide } = context.conditions as { motion: boolean; wide: boolean };
      if (!motion) return;

      // Reveals: only what's still below the fold starts transparent, so nothing on screen blinks.
      // Opacity only, never visibility: hidden-by-visibility content drops out of the
      // accessibility tree, and screen-reader users would miss headings they haven't scrolled to.
      const pending = gsap.utils
        .toArray<HTMLElement>("[data-reveal]", root)
        .filter((element) => !ScrollTrigger.isInViewport(element, 0.1));
      gsap.set(pending, { opacity: 0, y: DISTANCE.lg });
      ScrollTrigger.batch(pending, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { opacity: 1, y: 0, duration: DURATION.expressive, ease: enter, stagger: STAGGER.loose }),
      });

      // The five steps as a story: each lights up in turn while the line between them draws.
      const steps = root.querySelector<HTMLElement>("[data-steps]");
      if (steps) {
        const cards = gsap.utils.toArray<HTMLElement>("[data-step]", steps);
        const line = steps.querySelector<HTMLElement>("[data-steps-line]");
        const story = gsap.timeline({ paused: true });
        if (line) story.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: DURATION.expressive * 2.5, ease: "none" }, 0);
        cards.forEach((card, index) => {
          story.fromTo(
            card,
            { opacity: 0, y: DISTANCE.md, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: DURATION.slow, ease: emphasized },
            index * ((DURATION.expressive * 2.5) / cards.length),
          );
        });
        ScrollTrigger.create({ trigger: steps, start: "top 70%", once: true, onEnter: () => story.play() });
      }

      // Subtle parallax, on tablets and computers only: phones keep every frame for scrolling.
      if (wide) {
        for (const element of gsap.utils.toArray<HTMLElement>("[data-parallax]", root)) {
          const distance = Math.min(Number(element.dataset.parallax) || DISTANCE.md, DISTANCE.xl);
          gsap.fromTo(
            element,
            { y: distance / 2 },
            {
              y: -distance / 2,
              ease: "none",
              scrollTrigger: { trigger: element.closest("section") ?? element, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }
      }

      // Count-ups: the real number is already in the HTML; this only replays it on arrival.
      for (const element of gsap.utils.toArray<HTMLElement>("[data-count-to]", root)) {
        const target = Number(element.dataset.countTo);
        const counter = { value: 0 };
        ScrollTrigger.create({
          trigger: element,
          start: "top 90%",
          once: true,
          onEnter: () =>
            gsap.to(counter, {
              value: target,
              duration: DURATION.expressive * 1.5,
              ease: enter,
              snap: { value: 1 },
              onUpdate: () => {
                element.textContent = String(counter.value);
              },
            }),
        });
      }
    },
  );

  return () => media.revert();
}
