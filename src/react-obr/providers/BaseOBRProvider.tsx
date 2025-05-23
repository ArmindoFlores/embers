/* eslint-disable react-refresh/only-export-components */

import OBR, { Metadata, Permission, Player } from "@owlbear-rodeo/sdk";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { log_error } from "../../logging";

export interface BaseOBRContextType {
    party: Player[];
    player: Player|null;
    roomMetadata: Metadata;
    sceneMetadata: Metadata;
    setRoomMetadata: (metadata: Partial<Metadata>) => void;
    setSceneMetadata: (metadata: Partial<Metadata>) => void;
    setPlayerMetadata: (metadata: Partial<Metadata>) => void;
    roomPermissions: Permission[];
    ready: boolean;
    sceneReady: boolean;
}

const BaseOBRContext = createContext<BaseOBRContextType>({
    party: [],
    player: null,
    roomMetadata: {},
    sceneMetadata: {},
    setRoomMetadata: () => {},
    setSceneMetadata: () => {},
    setPlayerMetadata: () => {},
    roomPermissions: [],
    ready: false,
    sceneReady: false,
});
export const useOBR = () => useContext(BaseOBRContext);

export function BaseOBRProvider({ children }: { children: React.ReactNode }) {
    const [ party, setParty ] = useState<Player[]>([]);
    const [ player, setPlayer ] = useState<Player|null>(null);
    const [ roomMetadata, _setRoomMetadata ] = useState<Metadata>({});
    const [ sceneMetadata, _setSceneMetadata ] = useState<Metadata>({});
    const [ sceneReady, setSceneReady ] = useState(false);
    const [ roomPermissions, setRoomPermissions ] = useState<Permission[]>([]);
    const [ ready, setReady ] = useState(false);

    // Subscribe to OBR initialization
    useEffect(() => {
        if (OBR.isReady) {
            setReady(true);
        }
        return OBR.onReady(() => setReady(true));
    }, []);

    // Subscribe to party changes
    useEffect(() => {
        if (ready) {
            return OBR.party.onChange(players => {
                setParty(players);
            });
        }
    }, [ready]);

    // Subscribe to player changes
    useEffect(() => {
        if (ready) {
            return OBR.player.onChange(newPlayer => {
                setPlayer(newPlayer);
            });
        }
    }, [ready]);

    // Subscribe to metadata changes
    useEffect(() => {
        if (ready) {
            return OBR.room.onMetadataChange(metadata => {
                _setRoomMetadata(metadata);
            });
        }
    }, [ready]);

    // Subscribe to metadata changes
    useEffect(() => {
        if (ready) {
            return OBR.scene.onMetadataChange(metadata => {
                _setSceneMetadata(metadata);
            });
        }
    }, [ready]);

    // Subscribe to permission changes
    useEffect(() => {
        if (ready) {
            return OBR.room.onPermissionsChange(permissions => {
                setRoomPermissions(permissions);
            });
        }
    }, [ready]);

    // Subscribe to scene readiness changes
    useEffect(() => {
        if (ready) {
            return OBR.scene.onReadyChange(ready => {
                if (!ready) _setSceneMetadata({});
                setSceneReady(ready);
            });
        }
    }, [ready])

    // Initialize values after setup
    useEffect(() => {
        if (ready) {
            const initPromises = [
                OBR.party.getPlayers().then(setParty),
                Promise.all([
                    OBR.player.getId(),
                    OBR.player.getConnectionId(),
                    OBR.player.getRole(),
                    OBR.player.getSelection(),
                    OBR.player.getName(),
                    OBR.player.getColor(),
                    OBR.player.getSyncView(),
                    OBR.player.getMetadata(),
                ]).then(player => setPlayer({
                    id: player[0],
                    connectionId: player[1],
                    role: player[2],
                    selection: player[3],
                    name: player[4],
                    color: player[5],
                    syncView: player[6],
                    metadata: player[7]
                })),
                OBR.room.getPermissions().then(setRoomPermissions),
                OBR.room.getMetadata().then(_setRoomMetadata),
                OBR.scene.isReady().then(setSceneReady),
            ]
            Promise.all(initPromises).catch(e => log_error("Unknown error:", e));
        }
    }, [ready]);
    useEffect(() => {
        if (ready && sceneReady) {
            const initPromises = [
                OBR.scene.getMetadata().then(_setSceneMetadata),
            ];
            Promise.all(initPromises).catch(e => log_error("Unknown error:", e))
        }
    }, [ready, sceneReady])

    const setRoomMetadata = useCallback((metadata: Partial<Metadata>) => {
        OBR.room.setMetadata(metadata);
    }, []);

    const setSceneMetadata = useCallback((metadata: Partial<Metadata>) => {
        OBR.scene.setMetadata(metadata);
    }, []);

    const setPlayerMetadata = useCallback((metadata: Partial<Metadata>) => {
        OBR.player.setMetadata(metadata);
    }, []);

    return <BaseOBRContext.Provider value={{ready, sceneReady, party, player, roomMetadata, sceneMetadata, setRoomMetadata, setSceneMetadata, setPlayerMetadata, roomPermissions}}>
        { children }
    </BaseOBRContext.Provider>;
}
