import { log_error, log_info } from "../logging";

import { APP_KEY } from "../config";
import OBR from "@owlbear-rodeo/sdk";
import { Spell } from "../types/spells";
import { getSpell } from "./spells";
import objectHash from "object-hash";
import { spellListMetadataKey } from "../views/NewSpellModal";

export const SETUP_MESSAGE_CHANNEL = `${APP_KEY}/setup`;
export interface ClientSetupMessageData {
    type: "GET_LOCAL_SPELLS"|"LIST_LOCAL_SPELLS";
    payload?: string[];
    source: string;
}
export interface ServerSetupMessageData {
    type: "LOCAL_SPELLS"|"LOCAL_SPELLS_LIST";
    destination: string;
    localSpells: Record<string, Spell>;
    localSpellsList: [string, string][];
}

function getLocalSpellsDifference(roomId: string, spellList: [string, string][]) {
    const currentSpellListJSON = localStorage.getItem(`${spellListMetadataKey}/${roomId}`);
    const currentSpellList: [string, string][] = JSON.parse(currentSpellListJSON ?? "[]");

    const currentSpellMap = new Map(currentSpellList);
    const spellMap = new Map(spellList);

    const newSpells: [string, string][] = [];
    const deletedSpells: [string, string][] = [];

    for (const [key, value] of spellList) {
        if (!currentSpellMap.has(key) || currentSpellMap.get(key) !== value) {
            newSpells.push([key, value]);
        }
    }

    for (const [key, value] of currentSpellList) {
        if (!spellMap.has(key) || spellMap.get(key) !== value) {
            deletedSpells.push([key, value]);
        }
    }
    return [newSpells, deletedSpells];
}

function deleteLocalSpells(roomId: string, spellList: [string, string][]) {
    const currentSpellListJSON = localStorage.getItem(`${spellListMetadataKey}/${roomId}`);
    const currentSpellList: [string, string][] = JSON.parse(currentSpellListJSON ?? "[]");
    const newSpellList = currentSpellList.filter(spell => !spellList.map(spell => spell[0]).includes(spell[0]));
    const newSpellListJSON = JSON.stringify(newSpellList);
    localStorage.setItem(`${spellListMetadataKey}/${roomId}`, newSpellListJSON);
    for (const spell of spellList) {
        localStorage.removeItem(`${APP_KEY}/spells/${roomId}/${spell[0]}`);
    }
}

function addLocalSpells(roomId: string, spells: Record<string, Spell>) {
    const spellList = Object.entries(spells).map(([spellIDs, spell]) => [spellIDs, objectHash.sha1(spell)]);
    const currentSpellListJSON = localStorage.getItem(`${spellListMetadataKey}/${roomId}`);
    const currentSpellList: [string, string][] = JSON.parse(currentSpellListJSON ?? "[]");
    const currentSpellMap = new Map(currentSpellList);
    const newSpellList = [...currentSpellList, ...spellList.filter(s => !currentSpellMap.has(s[0]))];
    const newSpellListJSON = JSON.stringify(newSpellList);
    localStorage.setItem(`${spellListMetadataKey}/${roomId}`, newSpellListJSON);
    for (const [spellID, spell] of Object.entries(spells)) {
        localStorage.setItem(`${APP_KEY}/spells/${roomId}/${spellID}`, JSON.stringify(spell));
    }
}

export function setupPlayerLocalSpells(roomId: string, playerID: string) {
    const unsubscribe = OBR.broadcast.onMessage(SETUP_MESSAGE_CHANNEL, message => {
        const data = message.data as ServerSetupMessageData;
        if (data.destination !== "all" && data.destination !== playerID) {
            return;
        }
        if (data.type === "LOCAL_SPELLS_LIST") {
            const [newSpells, deletedSpells] = getLocalSpellsDifference(roomId, data.localSpellsList);
            if (newSpells.length > 0) {
                OBR.broadcast.sendMessage(
                    SETUP_MESSAGE_CHANNEL,
                    {
                        type: "GET_LOCAL_SPELLS",
                        payload: newSpells.map(spell => spell[0])
                    },
                    { destination: "REMOTE" }
                );
            }
            if (newSpells.length > 0 || deletedSpells.length > 0) {
                deleteLocalSpells(roomId, deletedSpells);
                log_info(`Deleted ${deletedSpells.length} spell(s) (expecting ${newSpells.length} to be added)`);
            }
        }
        else if (data.type === "LOCAL_SPELLS") {
            const nSpells = Object.keys(data.localSpells).length;
            if (nSpells > 0) {
                addLocalSpells(roomId, data.localSpells);
                log_info(`Added ${nSpells} new spell(s)`);
            }
        }
        else {
            log_error(`Invalid message type "${data.type}"`);
        }
    });
    OBR.broadcast.sendMessage(
        SETUP_MESSAGE_CHANNEL,
        {
            type: "LIST_LOCAL_SPELLS"
        },
        { destination: "REMOTE" }
    );

    return unsubscribe;
}

export function sendSpellsUpdate(destination: string) {
    const localSpellsListJSON = localStorage.getItem(spellListMetadataKey);
    const localSpellsListWithoutHash = JSON.parse(localSpellsListJSON ?? "[]");
    const localSpellsList = (localSpellsListWithoutHash as string[]).map(
        (spellID: string) => [spellID, getSpell(`$.${spellID}`, true)] as [string, Spell|undefined]
    ).filter(
        o => o[1] != undefined
    ).map(
        ([spellID, spell]) => [spellID, objectHash.sha1(spell!)]
    );

    OBR.broadcast.sendMessage(
        SETUP_MESSAGE_CHANNEL,
        {
            type: "LOCAL_SPELLS_LIST",
            destination: destination,
            localSpells: [],
            localSpellsList
        },
        { destination: "REMOTE" }
    );
}

export function setupGMLocalSpells(playerConnections: Record<string, string>) {
    const unsubscribe = OBR.broadcast.onMessage(SETUP_MESSAGE_CHANNEL, message => {
        const data = message.data as ClientSetupMessageData;
        if (data.type === "LIST_LOCAL_SPELLS") {
            log_info(`Client[${playerConnections[message.connectionId]}] asked for a list of spells`);
            sendSpellsUpdate(playerConnections[message.connectionId]);
        }
        else if (data.type === "GET_LOCAL_SPELLS" && data.payload != undefined) {
            const localSpells = Object.fromEntries(data.payload.map(spellID => ([
                spellID,
                getSpell(`$.${spellID}`, true)
            ])));
            log_info(`Client[${playerConnections[message.connectionId]}] asked to get`, data.payload);
            log_info("Replying with", localSpells);
            OBR.broadcast.sendMessage(
                SETUP_MESSAGE_CHANNEL,
                {
                    type: "LOCAL_SPELLS",
                    destination: playerConnections[message.connectionId],
                    localSpells,
                    localSpellsList: []
                },
                { destination: "REMOTE" }
            );
        }
        else {
            log_error(`Invalid message type "${data.type}"`);
        }
    });

    return unsubscribe;
}
