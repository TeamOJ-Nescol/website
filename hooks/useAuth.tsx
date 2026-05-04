import { Spinner } from "@/components/ui/spinner";
import { axiosInstance } from "@/lib/api";
import { useMutation, UseMutationResult, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";

type context = {
    user: any | null,
    isAuthenticated: boolean,
    isLoading: boolean,
    isPending: boolean,
    error: Error | null,
}

const AuthContext = createContext<context>({
    user: null,
    error: null,
    isAuthenticated: false,
    isLoading: true,
    isPending: true
})

const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }: any) {
    const router = useRouter()
    const URL = process.env.NEXT_PUBLIC_API_URL || null;

    const { isPending, error, data, isLoading } = useQuery({
        queryKey: ['userData'],
        queryFn: async () => {
            const res = await axiosInstance.get(`/auth/check`);

            if (res.status != 200) {
                return { user: null, isAuthenticated: false };
            }

            return await res.data;
        },
        retry: false,
        staleTime: 1000 * 60 * 5,
    })

    const value: context = {
        user: data?.["user"] || null,
        isAuthenticated: data?.["isAuthenticated"] || false,
        isLoading: isLoading,
        isPending: isPending,
        error: error
    }

    useEffect(() => {
        if (!value.isLoading && !value.isAuthenticated && !value.isPending) {
            router.replace("/login")
        }
    }, [value.isLoading, value.isAuthenticated, value.isPending, router])

    if (isLoading || isPending) {
        return (
            <AuthContext.Provider value={value}>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <Spinner />
                        <p>Loading...</p>
                    </div>
                </div>
            </AuthContext.Provider>
        )
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export {
    AuthProvider,
    useAuth,
    AuthContext
};