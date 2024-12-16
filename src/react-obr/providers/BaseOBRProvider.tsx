/* eslint-disable react-refresh/only-export-components */

import BaseOBR, { Metadata, Permission, Player } from "@owlbear-rodeo/sdk";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { APP_KEY } from "../../config";

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

if (window[APP_KEY] === undefined) {
    window[APP_KEY] = {};
}
window[APP_KEY].OBR = BaseOBR;

export function BaseOBRProvider({ children, proxy }: { children: React.ReactNode, proxy: boolean }) {
    const [ party, setParty ] = useState<Player[]>([]);
    const [ player, setPlayer ] = useState<Player|null>(null);
    const [ roomMetadata, _setRoomMetadata ] = useState<Metadata>({});
    const [ sceneMetadata, _setSceneMetadata ] = useState<Metadata>({});
    const [ sceneReady, setSceneReady ] = useState(false);
    const [ roomPermissions, setRoomPermissions ] = useState<Permission[]>([]);
    const [ ready, setReady ] = useState(false);
    
    const fOBR = useCallback(() => {
        if (proxy) {
            return window.opener[APP_KEY]?.OBR as (typeof BaseOBR) | undefined;
        }
        return window[APP_KEY]?.OBR;
    }, [proxy]);
    const OBR = fOBR();

    // Subscribe to OBR initialization
    useEffect(() => {
        if (OBR == undefined) return;
        if (OBR.isReady) {
            setReady(true);
        }
        return OBR.onReady(() => setReady(true));
    }, [OBR]);

    // Subscribe to party changes
    useEffect(() => {
        if (OBR == undefined) return;
        if (ready) {
            return OBR.party.onChange(players => {
                setParty(players);
            });
        }
    }, [ready, OBR]);

    // Subscribe to player changes
    useEffect(() => {
        if (OBR == undefined) return;
        if (ready) {
            return OBR.player.onChange(newPlayer => {
                setPlayer(newPlayer);
            });
        }
    }, [ready, OBR]);
    useEffect(() => {
        if (OBR == undefined) return;
        if (ready && player === null) {
            setPlayer(party.find(player => player.id === OBR.player.id) ?? null);
        }
    }, [ready, party, player, OBR]);

    // Subscribe to metadata changes
    useEffect(() => {
        if (OBR == undefined) return;
        if (ready) {
            return OBR.room.onMetadataChange(metadata => {
                _setRoomMetadata(metadata);
            });
        }
    }, [ready, OBR]);

    // Subscribe to metadata changes
    useEffect(() => {
        if (OBR == undefined) return;
        if (ready) {
            return OBR.scene.onMetadataChange(metadata => {
                _setSceneMetadata(metadata);
            });
        }
    }, [ready, OBR]);

    // Subscribe to permission changes
    useEffect(() => {
        if (OBR == undefined) return;
        if (ready) {
            return OBR.room.onPermissionsChange(permissions => {
                setRoomPermissions(permissions);
            });
        }
    }, [ready, OBR]);

    // Subscribe to scene readiness changes
    useEffect(() => {
        if (OBR == undefined) return;
        if (ready) {
            return OBR.scene.onReadyChange(ready => {
                if (!ready) _setSceneMetadata({});
                setSceneReady(ready);
            });
        }
    }, [ready, OBR])

    // Initialize values after setup
    useEffect(() => {
        if (OBR == undefined) return;
        if (ready) {
            const initPromises = [
                OBR.party.getPlayers().then(setParty),
                OBR.room.getPermissions().then(setRoomPermissions),
                OBR.room.getMetadata().then(_setRoomMetadata),
                OBR.scene.getMetadata().then(_setSceneMetadata),
                OBR.scene.isReady().then(setSceneReady),
                OBR.player.getMetadata().then(metadata => OBR.player.setMetadata(metadata)), // Horrible, but only way to trigger Player.onChange?
            ]
            Promise.all(initPromises).catch(() => null);
        }
    }, [ready, OBR]);

    const setRoomMetadata = useCallback((metadata: Partial<Metadata>) => {
        if (OBR == undefined) return;
        OBR.room.setMetadata(metadata);
    }, [OBR]);

    const setSceneMetadata = useCallback((metadata: Partial<Metadata>) => {
        if (OBR == undefined) return;
        OBR.scene.setMetadata(metadata);
    }, [OBR]);

    const setPlayerMetadata = useCallback((metadata: Partial<Metadata>) => {
        if (OBR == undefined) return;
        OBR.player.setMetadata(metadata);
    }, [OBR]);

    return <BaseOBRContext.Provider value={{ready, sceneReady, party, player, roomMetadata, sceneMetadata, setRoomMetadata, setSceneMetadata, setPlayerMetadata, roomPermissions}}>
        { children }
    </BaseOBRContext.Provider>;
}
