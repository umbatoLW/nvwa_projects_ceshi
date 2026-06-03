import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface AIStreamState {
  isRunning: boolean;
  progress: number;
  stage: string;
  message: string;
  error: string | null;
}

interface AIStreamStore {
  streams: Record<string, AIStreamState>;
  setStream: (id: string, state: Partial<AIStreamState>) => void;
  removeStream: (id: string) => void;
  resetAll: () => void;
}

export const initialStreamState: AIStreamState = {
  isRunning: false,
  progress: 0,
  stage: "",
  message: "",
  error: null,
};

export const useAIStreamStore = create<AIStreamStore>()(
  subscribeWithSelector((set) => ({
    streams: {},
    
    setStream: (id, state) =>
      set((prev) => ({
        streams: {
          ...prev.streams,
          [id]: {
            ...(prev.streams[id] || initialStreamState),
            ...state,
          },
        },
      })),
    
    removeStream: (id) =>
      set((prev) => {
        const { [id]: _, ...rest } = prev.streams;
        return { streams: rest };
      }),
    
    resetAll: () => set({ streams: {} }),
  }))
);
