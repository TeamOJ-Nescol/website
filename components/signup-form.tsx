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
import { axiosInstance } from "@/lib/api"
import { Spinner } from "./ui/spinner"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordCheck, setPasswordCheck] = useState("")
  const [passCheckFail, setPassCheckFail] = useState(false)

  const createUserMutation = useMutation({
    mutationFn: async (details: {
      username: string
      email: string
      password: string
    }) => {
      const response = await axiosInstance.post(`/users/create`, {
          name: details.username,
          email: details.email,
          password: details.password
      })

      if (response.status != 201) {
        throw new Error(response.statusText || "Failed to create account")
      }

      return response.data
    },
    onSuccess: (data) => {
      console.log("Account created successfully:", data)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    },
    onError: (error: Error) => {
      console.error("Signup error:", error)
    }
  })

  function handleUsernameChange(e: any) {
    setUsername(e.target.value);
  }

  function handleEmailChange(e: any) {
    setEmail(e.target.value);
  }

  function handlePasswordChange(e: any) {
    setPassword(e.target.value);
  }

  function handlePasswordCheckChange(e: any) {
    setPasswordCheck(e.target.value);
  }

  function submitForm(e: any) {
    e.preventDefault()

    if (password == passwordCheck) {
      console.log({
        username: username,
        email: email,
        password: password
      })
      createUserMutation.mutate({
        username: username,
        email: email,
        password: password
      })      
    } else {
      setPassCheckFail(true)
    }
  }
  
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Signup for an account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to create your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="text">Username</FieldLabel>
          <Input
            id="text"
            type="text"
            placeholder="struan"
            required
            className="bg-background"
            onChange={handleUsernameChange}
          />
        </Field>
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
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            required
            className="bg-background"
            onChange={handlePasswordChange}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="check">Retype Password</FieldLabel>
          <Input
            id="check"
            type="password"
            required
            className="bg-background"
            onChange={handlePasswordCheckChange}
          />
        </Field>
        <Field>
          <Button 
            className="w-full !bg-green-600 text-white"
            disabled={createUserMutation.isPending} onClick={submitForm}
          >
            {
              createUserMutation.isPending ?
                <Spinner />
              :
                "Signup"
            }
          </Button>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <a href="/login" className="underline underline-offset-4">
              Login
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
