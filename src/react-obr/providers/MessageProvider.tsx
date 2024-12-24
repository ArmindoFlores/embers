/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import OBR from "@owlbear-rodeo/sdk";
import { arrayEqual } from "../../hooks";
import { useOBR } from "./BaseOBRProvider";

export interface Message {
    sender: string;
    message: unknown;
    realSender?: string;
}

interface InternalMessage extends Message {
    recipients?: string[];
}

export type DestinationOptions = "REMOTE" | "LOCAL" | "ALL";

export interface OBRMessageContextType {
    sendMessage: (message: unknown, to?: string[], destination?: DestinationOptions) => void;
    registerMessageHandler: (handler: (msg: Message) => void) => () => void;
}

const OBRMessageContext = createContext<OBRMessageContextType>({
    sendMessage: () => {},
    registerMessageHandler: () => { return () => {} }
});
export const useOBRMessaging = () => useContext(OBRMessageContext);

export function OBRMessageProvider({ children, appKey }: { children: React.ReactNode, appKey: string, proxy: boolean }) {
    const { player, party, ready } = useOBR();

    const [ handlers, setHandlers ] = useState<((msg: Message) => void)[]>([]);
    const [ partyIDs, setPartyIDs ] = useState<{ id: string, connectionId: string }[]>([]);

    const sendMessage = useCallback((message: unknown, to?: string[], destination?: DestinationOptions) => {
        OBR.broadcast.sendMessage(appKey, {
            sender: player?.id,
            recipients: to,
            message: message
        }, { destination: destination ?? "REMOTE" });
    }, [appKey, player?.id]);

    const registerMessageHandler = useCallback((handler: (msg: Message) => void) => {
        setHandlers(prev => [...prev, handler]);
        return () => {
            setHandlers(prev => prev.filter(h => h !== handler));
        };
    }, []);

    useEffect(() => {
        if (
            !arrayEqual(party.map(player => player.id), partyIDs.map(player => player.id)) ||
            !arrayEqual(party.map(player => player.connectionId), partyIDs.map(player => player.connectionId))
        ) {
            setPartyIDs(party.map(player => ({ id: player.id, connectionId: player.connectionId })));
        }
    }, [party, partyIDs]);

    useEffect(() => {
        if (!ready) return;

        return OBR.broadcast.onMessage(appKey, e => {
            const messageData = e.data as InternalMessage;
            if (messageData.recipients === undefined || (player?.id && messageData.recipients.includes(player.id))) {
                handlers.forEach(handler => handler({
                    sender: messageData.sender,
                    realSender: partyIDs.find(possibleSender => possibleSender.connectionId === e.connectionId)?.id,
                    message: messageData.message
                }));
            }
        });
    }, [player?.id, handlers, appKey, partyIDs, ready]);

    return <OBRMessageContext.Provider value={{sendMessage, registerMessageHandler}}>
        { children }
    </OBRMessageContext.Provider>;
}
