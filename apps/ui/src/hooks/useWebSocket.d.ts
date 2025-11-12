declare const useWebSocket: (vfsToken: string | null) => {
    status: "disconnected" | "connecting" | "connected";
    messages: import("@repo/common/agent").TerminalMessage[];
    sendMessage: (payload: any) => void;
};
export default useWebSocket;
