import { cn } from "@/lib/utils";

interface TeamMember {
  name: string;
  role: string;
  image: string;
}

interface Team36Props {
  heading?: string;
  members?: TeamMember[];
  className?: string;
}

const Team36 = ({
  heading = "Our Team",
  members = [
    {
      name: "Struan McLean",
      role: "Software Dev",
      image:
        "",
    },
    {
      name: "Cristian Nescol or smth",
      role: "Software Dev and Pro Sleeper",
      image:
        "",
    },
    {
      name: "Calvin",
      role: "",
      image:
        "",
    },
  ],
  className,
}: Team36Props) => {
  return (
    <section className={cn("container max-w-5xl py-12", className)}>
      <h2 className="text-4xl font-medium tracking-wide text-foreground">
        {heading}
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {members.map((member) => (
          <div key={member.name}>
            <img
              src={member.image}
              alt={member.name}
              className="size-30 object-cover"
            />
            <h3 className="mt-3 font-semibold">{member.name}</h3>
            <p className="text-muted-foreground">{member.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export { Team36 };
