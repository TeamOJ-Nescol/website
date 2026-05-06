"use client";
import { axiosInstance } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type GameMode = "501" | "301" | "cricket";
export type GameStatus = "in_progress" | "finished";

export type GamePlayer = {
  id: number;
  gameId: number;
  name: string;
  position: number;
  currentScore: number | null;
  finalScore: number | null;
  dartsThrown: number;
};

export type Game = {
  id: number;
  ownerId: number;
  mode: GameMode;
  status: GameStatus;
  winner: string | null;
  state: string;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  players: GamePlayer[];
};

export type GameStats = {
  totalGames: number;
  finishedGames: number;
  wins: number;
  byMode: Record<string, number>;
  totalDarts: number;
};

export function useGames() {
  return useQuery({
    queryKey: ["games"],
    queryFn: async () => (await axiosInstance.get<Game[]>("/games")).data,
  });
}

export function useGame(id: number | null) {
  return useQuery({
    queryKey: ["games", id],
    queryFn: async () => (await axiosInstance.get<Game>(`/games/${id}`)).data,
    enabled: id != null,
  });
}

export function useGameStats() {
  return useQuery({
    queryKey: ["games", "stats"],
    queryFn: async () => (await axiosInstance.get<GameStats>("/games/stats")).data,
  });
}

export function useCreateGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { mode: GameMode; players: string[] }) =>
      (await axiosInstance.post<Game>("/games", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["games"] });
    },
  });
}

export function useUpdateGameState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      state: unknown;
      players?: { position: number; currentScore?: number; dartsThrown?: number }[];
    }) =>
      (
        await axiosInstance.patch<Game>(`/games/${input.id}`, {
          state: JSON.stringify(input.state),
          players: input.players,
        })
      ).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["games", vars.id] });
      qc.invalidateQueries({ queryKey: ["games"] });
    },
  });
}

export function useFinishGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      winner?: string | null;
      state?: unknown;
      players: { name: string; position: number; finalScore?: number; dartsThrown?: number }[];
    }) =>
      (
        await axiosInstance.post<Game>(`/games/${input.id}/finish`, {
          winner: input.winner ?? null,
          state: input.state ? JSON.stringify(input.state) : undefined,
          players: input.players,
        })
      ).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["games", vars.id] });
      qc.invalidateQueries({ queryKey: ["games", "stats"] });
    },
  });
}

export function useDeleteGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await axiosInstance.delete(`/games/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["games", "stats"] });
    },
  });
}
