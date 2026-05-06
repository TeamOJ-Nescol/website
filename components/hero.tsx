import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroCard {
  title: string;
  description: string;
  image?: Image;
  icon?: React.ReactNode;
  href?: string;
}
interface Image {
  src: string;
  alt: string;
}
interface Button {
  text: string;
  url: string;
  icon?: React.ReactNode;
}
interface Buttons {
  primary?: Button;
  secondary?: Button;
}
interface Badge {
  text: string;
  announcement?: string;
  url?: string;
}

interface HeroCardsProps {
  badge?: Badge;
  heading: string;
  description?: string;
  buttons?: Buttons;
  cards: HeroCard[];
  className?: string;
}

interface Hero207Props extends HeroCardsProps {}
type Props = Partial<Hero207Props>;

/** Shared horizontal pull so middle & right cards overlap the previous column */
const cardOverlapX = "-ml-[28vw] sm:-ml-28 md:-ml-20 lg:-ml-14 xl:-ml-14";

const defaultProps: HeroCardsProps = {
  badge: {
    text: "New Release",
  },
  heading: "Darts taken seriously",
  description: "Created by struan, cristian and calvin allows users to track their darts automaticly with a camera and some AI magic (and ofc some math)",
  buttons: {
    primary: {
      text: "Get Started",
      url: "/signup",
    },
    secondary: {
      text: "Learn More",
      url: "",
    },
  },
  cards: [
    {
      title: "",
      description: "",
      image: {
        src: "/dartboard.JPG",
        alt: "",
      },
    },
    {
      title: "",
      description: "",
      image: {
        src: "/dartboard2.JPG",
        alt: "",
      },
    },
    {
      title: "",
      description: "",
      image: {
        src: "/dartboard3.JPG",
        alt: "",
      },
    },
  ],
};

const Hero207 = (props: Props) => {
  const { badge, heading, description, buttons, cards, className } = {
    ...defaultProps,
    ...props,
  };

  return (
    <section
      className={cn(
        "overflow-x-visible py-12 lg:py-24 xl:overflow-x-clip xl:py-32",
        className,
      )}
    >
      <div className="relative container flex flex-col items-center">
        <div className="container flex w-full flex-col">
          <div className="flex w-full flex-col gap-6 sm:gap-8">
            {badge &&
              (badge.url ? (
                <Badge variant="outline" className="w-fit" asChild>
                  <a href={badge.url}>
                    {badge.announcement ? (
                      <span className="sr-only">{badge.announcement}</span>
                    ) : null}
                    {badge.text}
                  </a>
                </Badge>
              ) : (
                <Badge variant="outline" className="w-fit">
                  {badge.announcement ? (
                    <span className="sr-only">{badge.announcement}</span>
                  ) : null}
                  {badge.text}
                </Badge>
              ))}
            <h1 className="relative z-20 max-w-4xl text-4xl font-semibold tracking-tighter text-pretty md:text-5xl lg:text-6xl">
              {heading}
            </h1>
            <p className="max-w-2xl text-base tracking-tight text-muted-foreground sm:text-lg md:text-xl">
              {description}
            </p>
            {buttons?.primary && (
              <div className="flex flex-col items-start">
                <Button asChild size="lg">
                  <a href={buttons.primary.url}>{buttons.primary.text}</a>
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-10 flex w-full items-start justify-center gap-0 px-2 pt-4 pb-12 sm:mt-12 sm:px-3 sm:pb-14 md:mt-14 md:px-4 md:pt-2 md:pb-14 lg:pb-16 xl:pb-0">
          {cards[0] ? (
            <Hero207FeaturedCard
              key={`0-${cards[0].title}`}
              card={cards[0]}
              className="relative z-10 translate-y-16 sm:translate-y-20 md:translate-y-14 lg:translate-y-10 xl:translate-y-0"
            />
          ) : null}
          {cards[2] ? (
            <Hero207FeaturedCard
              key={`2-${cards[2].title}`}
              card={cards[2]}
              className={cn(
                "relative z-20 translate-y-1 sm:translate-y-8 md:translate-y-3 lg:translate-y-0 xl:-translate-y-28",
                cardOverlapX,
              )}
            />
          ) : null}
          {cards[1] ? (
            <Hero207FeaturedCard
              key={`1-${cards[1].title}`}
              card={cards[1]}
              className={cn(
                "relative z-30 -translate-y-10 sm:-translate-y-4 md:-translate-y-14 lg:-translate-y-14 xl:-translate-y-52",
                cardOverlapX,
              )}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
};

export { Hero207 };

function Hero207FeaturedCard({
  card,
  className,
}: {
  card: HeroCard;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-3/4 w-full min-w-0 flex-1 basis-0 p-2 sm:p-3 md:p-4",
        className,
      )}
    >
      <div className="relative h-full w-full">
        <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-[0_0_0_1px_rgb(0_0_0/0.05),0_2px_4px_-1px_rgb(0_0_0/0.04),0_16px_32px_-6px_rgb(0_0_0/0.08)] sm:rounded-3xl dark:shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_2px_4px_-1px_rgb(0_0_0/0.35),0_16px_32px_-6px_rgb(0_0_0/0.55)]">
          {card.image && (
            <img
              src={card.image.src}
              alt={card.image.alt}
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/45 via-black/10 to-transparent" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-end px-3 pt-5 pb-6 sm:px-5 sm:pb-8 md:px-6 md:pb-10 lg:px-10 lg:pb-12">
          <div className="flex w-full flex-col items-center">
            <h2 className="max-w-40 text-center text-lg font-semibold tracking-tight text-pretty text-background sm:max-w-xs sm:text-xl md:max-w-sm md:text-2xl lg:max-w-md lg:text-3xl xl:max-w-none xl:text-4xl 2xl:text-5xl">
              {card.title}
            </h2>
            <p className="mt-2 hidden max-w-sm px-1 text-center text-sm leading-snug tracking-tighter text-background/80 sm:mt-3 md:block md:text-sm lg:mt-4 lg:text-base xl:mt-5 xl:text-lg 2xl:mt-6 2xl:text-xl">
              {card.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
