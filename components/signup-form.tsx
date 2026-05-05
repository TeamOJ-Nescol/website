import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { useMutation } from "@tanstack/react-query"
import { axiosInstance } from "@/lib/api"
import { Spinner } from "./ui/spinner"
import axios from "axios"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordCheck, setPasswordCheck] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const createUserMutation = useMutation({
    mutationFn: async (details: {
      username: string
      email: string
      password: string
    }) => {
      const response = await axiosInstance.post(`/users/create`, {
        name: details.username.trim(),
        email: details.email.trim(),
        password: details.password,
      })

      if (response.status != 201) {
        throw new Error(response.statusText || "Failed to create account")
      }

      if (response.data?.success === false) {
        throw new Error("An account with that email already exists")
      }

      return response.data
    },
    onSuccess: (data) => {
      setErrorMessage("")
      console.log("Account created successfully:", data)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    },
    onError: (error: Error) => {
      if (axios.isAxiosError(error)) {
        const serverMessage = error.response?.data?.message

        if (Array.isArray(serverMessage) && serverMessage.length > 0) {
          setErrorMessage(serverMessage[0])
          return
        }

        if (typeof serverMessage === "string" && serverMessage.length > 0) {
          setErrorMessage(serverMessage)
          return
        }
      }

      setErrorMessage(error.message || "Failed to create account")
      console.error("Signup error:", error)
    }
  })

  function handleUsernameChange(e: ChangeEvent<HTMLInputElement>) {
    setErrorMessage("")
    setUsername(e.target.value);
  }

  function handleEmailChange(e: ChangeEvent<HTMLInputElement>) {
    setErrorMessage("")
    setEmail(e.target.value);
  }

  function handlePasswordChange(e: ChangeEvent<HTMLInputElement>) {
    setErrorMessage("")
    setPassword(e.target.value);
  }

  function handlePasswordCheckChange(e: ChangeEvent<HTMLInputElement>) {
    setErrorMessage("")
    setPasswordCheck(e.target.value);
  }

  function submitForm(e: FormEvent<HTMLFormElement>) {
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
      setErrorMessage("Passwords do not match")
    }
  }
  
  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={submitForm} {...props}>
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
            minLength={1}
            className="bg-background"
            value={username}
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
            value={email}
            onChange={handleEmailChange}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            className="bg-background"
            value={password}
            onChange={handlePasswordChange}
          />
          <FieldDescription>Use at least 8 characters.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="check">Retype Password</FieldLabel>
          <Input
            id="check"
            type="password"
            required
            className="bg-background"
            value={passwordCheck}
            onChange={handlePasswordCheckChange}
          />
        </Field>
        <FieldError>{errorMessage}</FieldError>
        <Field>
          <Button 
            className="w-full !bg-green-600 text-white"
            type="submit"
            disabled={createUserMutation.isPending}
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
