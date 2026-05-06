"use client"
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Page() {
    const auth = useAuth()
    const router = useRouter()
    const [users, setUsers] = useState<string[]>([auth.user.name])
    const [username, setUsername] = useState("")

    function addUser(e: any) {
        e.preventDefault()

        setUsers([...users, username])
        setUsername("")
    }

    function createGame(e: any) {
        e.preventDefault()
        window.sessionStorage.setItem("@players", JSON.stringify(users))
        router.push("/dashboard/games/pick-mode")
    }

    function hanndleUsernameChange(e: any) {
        setUsername(e.target.value);
    }

    return (
        <section className="w-full flex justify-center text-center">
            <div>
                <h1 className="text-2xl">Add Local Players</h1>

                <div>
                    <form>
                        <Field>
                            <FieldLabel htmlFor="user">Username</FieldLabel>
                            <Input
                                id="user"
                                type="user"
                                placeholder="Steven Bunting"
                                required
                                className="bg-background min-w-xl"
                                onChange={hanndleUsernameChange}
                            />
                        </Field>
                        <Field>
                            <Button
                                className="w-full mt-5 bg-green-600 text-white"
                                onClick={addUser}
                                disabled={username.length == 0}
                            >
                                Add Local User
                            </Button>

                            <Button
                                className="w-full mt-1 bg-green-600 text-white"
                                onClick={createGame}
                                disabled={users.length == 0}
                            >
                                Create Game
                            </Button>
                        </Field>
                    </form>
                </div>

                <div className="mt-10">
                    {
                        users.map((data, index) => (
                            <div key={index} className="bg-gray-500 pt-2 pb-4 mt-2">
                                <h1 className="mt-2">{data}</h1>
                            </div>
                        ))
                    }
                </div>
            </div>
        </section>
    )
}
