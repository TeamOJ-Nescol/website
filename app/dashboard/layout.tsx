"use client"
import { Geist_Mono, Nunito_Sans } from "next/font/google"

import "../globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

const nunitoSans = Nunito_Sans({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const queryClient = new QueryClient()

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", nunitoSans.variable)}
    >
      <body>
        
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <ThemeProvider>
                    <SidebarProvider
                        style={
                            {
                            "--sidebar-width": "calc(var(--spacing) * 72)",
                            "--header-height": "calc(var(--spacing) * 12)",
                            } as React.CSSProperties
                        }
                        >
                        <AppSidebar variant="inset" />
                        <SidebarInset>
                            <SiteHeader />
                            <div className="flex flex-1 flex-col">
                                <div className="@container/main flex flex-1 flex-col gap-2">
                                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                                        {children}
                                    </div>
                                </div>
                            </div>
                        </SidebarInset>
                    </SidebarProvider>
                </ThemeProvider>
            </AuthProvider>
          
        </QueryClientProvider>
      </body>
    </html>
  )
}
