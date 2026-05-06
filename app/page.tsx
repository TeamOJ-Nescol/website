import { About14 } from "@/components/about"
import { Hero207 } from "@/components/hero"
import { PromoBanner2 } from "@/components/promo"
import { Team36 } from "@/components/team"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <section className="w-full flex justify-center">
      <div>
        <PromoBanner2 />
        <Hero207 />      
        <About14 />  
        <Team36 />
      </div>
    </section>
  )
}
