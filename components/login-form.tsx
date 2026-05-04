import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import axios from "axios"
import { axiosInstance } from "@/lib/api"
import { Spinner } from "./ui/spinner"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passCheckFail, setPassCheckFail] = useState(false)

  const loginUserMutation = useMutation({
    mutationFn: async (details: {
      email: string,
      password: string
    }) => {
      const response = await axiosInstance.post(`/users/login`, {
          email: details.email,
          password: details.password
        }
      )

      console.log(response.status)
      
      if (response.status != 201) {
        throw new Error('Login failed')
      }
      
      return response.data
    },
    onSuccess: (data) => {
      console.log('Login successful:', data)

      if (data["success"] == false) {
        setPassCheckFail(true)
      } else {
        router.push("/dashboard")
      }
    },
    onError: (error) => {
      console.error('Login error:', error)
      setPassCheckFail(true)
    }
  })

  function handleEmailChange(e: any) {
    setEmail(e.target.value);
  }

  function handlePasswordChange(e: any) {
    setPassword(e.target.value);
  }

  function submitForm(e: any) {
    e.preventDefault()

    loginUserMutation.mutate({
      email: email,
      password: password
    })
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            className="bg-background"
            onChange={handleEmailChange}
          />
        </Field>
        <Field>
          <Input
            id="password"
            type="password"
            required
            className="bg-background"
            onChange={handlePasswordChange} 
          />
        </Field>
        <Field>
          <Button 
            className="w-full bg-green-600 text-white"
            disabled={loginUserMutation.isPending} onClick={submitForm}
          >
            {
              loginUserMutation.isPending ?
                <Spinner />
              :
                "Login"
            }
          </Button>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="underline underline-offset-4">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
