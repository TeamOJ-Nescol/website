import React from "react";

import { cn } from "@/lib/utils";

interface About14Props {
  className?: string;
}

const About14 = ({ className }: About14Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container space-y-10 lg:space-y-20">
        <div className="w-full grid-cols-6 gap-10 space-y-5 lg:grid lg:space-y-0">
          <h1 className="col-span-2 text-5xl font-semibold tracking-tight lg:text-7xl">
            About Us
          </h1>
          <div />
        </div>
        <div>
          <img
            src="/dartboard4.png"
            alt="about us iamge"
            className="mt-4 h-132 w-full object-cover"
          />
        </div>
        <div className="grid grid-cols-1 gap-10 space-y-12 lg:grid-cols-6 lg:space-y-0">
          <p className="hidden text-foreground lg:block">Our Team, Our weird story</p>
          <div className="order-2 col-span-2 lg:order-none lg:pr-24 lg:pl-10">
            <p className="text-foreground/40">
              We put our minds togeather (kinda) in sleep deprived states
            </p>
            <div className="mt-5 flex items-center gap-5 lg:mt-12">
              <div>
                <h3 className="text-lg font-medium tracking-tight">Cristian</h3>
                <p className="text-sm text-foreground/40">Director of sleep</p>
              </div>
            </div>
          </div>
          <div className="order-1 col-span-3 lg:order-none lg:mt-0 lg:pl-10">
            <h2 className="text-2xl font-medium tracking-tight lg:text-3xl">
              We built this after relising "oh #### we are nae good at math" and "why is my score wrong". 
              So we created this so we did not need to argue about what was the right score.
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
};

export { About14 };
