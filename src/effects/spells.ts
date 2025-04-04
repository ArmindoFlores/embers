import { BlueprintValue, Variables } from "../types/blueprint";
import { LOCAL_STORAGE_KEYS, getDefaultGridScaleFactor, getSettingsValue } from "../components/Settings";
import OBR, { Image, Item, Vector2, isImage } from "@owlbear-rodeo/sdk";
import { ReplicationType, Spell, Spells } from "../types/spells";
import { getSortedTargets, getTargetCount } from "../effectsTool";
import { resolveBlueprint, resolveSimpleValue } from "./blueprint";

import { APP_KEY } from "../config";
import { EffectInstruction } from "../types/messageListener";
import { MESSAGE_CHANNEL } from "../components/MessageListener";
import { SimplifiedItem } from "../types/misc";
import { getItemSize } from "../utils";
import { log_error } from "../logging";
import { spellListMetadataKey } from "../views/NewSpellModal";
import spellsJSON from "../assets/spells_record.json";

export const spells = spellsJSON as Spells;
export const spellIDs = Object.keys(spells);

export interface Target {
    id?: string;
    position: Vector2;
    size: number;
    count?: number;
}

function itemToTarget(item: Item): Target {
    return {
        id: item.attachedTo,
        position: item.position,
        size: getItemSize(item),
        count: getTargetCount(item)
    }
}

function replicateSpell(variables: Variables[], targets: Target[], parameterValues: object, replicationType: ReplicationType) {
    if (replicationType === "no") {
        variables.push({
            targets,
            ...parameterValues
        });
    }
    else if (replicationType === "all") {
        for (const target of targets) {
            variables.push({
                targets: [target],
                ...parameterValues
            });
        }
    }
    else if (replicationType === "first_to_all") {
        const firstTarget = targets[0];
        if (targets.length === 1) {
            variables.push({
                targets: [firstTarget],
                ...parameterValues
            });
        }
        for (const target of targets.slice(1)) {
            variables.push({
                targets: [
                    firstTarget,
                    target
                ],
                ...parameterValues
            });
        }
    }
}

function copySpellVariables(variables: Variables[], copyDelay: number) {
    if (copyDelay < 0) {
        // In the case of a negative copy delay, we don't copy the variables
        // and the count of the targets is set to 1
        for (const variableSet of variables) {
            for (const target of (variableSet.targets ?? []) as { count: number }[]) {
                target.count = 1;
            }
        }
    }
    if (copyDelay > 0) {
        // In the case of a positive delay, we need to replicate the spell
        // a number of times equal to the maximum target count, and set the
        // count to 0
        const newVariables: Variables[] = [];
        for (const variableSet of variables) {
            let count = 0;
            for (const target of (variableSet.targets ?? []) as { count: number }[]) {
                count = Math.max(count, target.count);
                target.count = 1;
            }
            for (let i = 0; i < count - 1; i++) {
                newVariables.push(variableSet);
            }
        }
        variables.push(...newVariables);
    }
}

function copySpellInstructions(instructions: EffectInstruction[], copyDelay: number) {
    if (copyDelay > 0) {
        // In the case of a positive delay, we add the delay to each instruction,
        // sequentially
        for (let i = 0; i < instructions.length; i++) {
            const instruction = instructions[i];
            if (instruction.delay == undefined) {
                instruction.delay = copyDelay * i;
            }
            else {
                instruction.delay += copyDelay * i;
            }
            if (instruction.instructions) {
                copySpellInstructions(instruction.instructions, copyDelay);
            }
        }
    }
}

export function getSpell(spellID: string, isGM: boolean = false): Spell|undefined {
    if (spellID.startsWith("$.")) {
        const localSpellID = spellID.substring(2);
        const spellJSON = localStorage.getItem(
            isGM ? `${APP_KEY}/spells/${localSpellID}` : `${APP_KEY}/spells/${OBR.room.id}/${localSpellID}`
        );
        if (spellJSON == undefined) {
            return undefined;
        }
        const spell = JSON.parse(spellJSON);
        return spell;
    }
    return spells[spellID];
}

export async function getAllSpellNames(): Promise<string[]> {
    const metadata = await OBR.scene.getMetadata();
    const spellList = (metadata[spellListMetadataKey] ?? []) as string[];
    return [...spellIDs, ...spellList.map(spell => `$.${spell}`)];
}

export function destroySpell(spellID: string, playerID: string, items: Item[], isGM: boolean = false) {
    const spell = getSpell(spellID, isGM);
    if (spell == undefined) {
        log_error(`Unknown spell "${spellID}"`);
        return;
    }

    const instructions: EffectInstruction[] = [];
    // FIXME: this should probably work more similarly to doSpell
    const variables: Variables = {
        targets: items.map(item => ({
            id: item.id,
            attachedId: item.attachedTo,
            position: item.position,
            size: getItemSize(item),
            count: 1
        }))
    };

    const { value, error } = resolveBlueprint(spell.onDestroyBlueprints ?? [], variables);
    if (error) {
        OBR.notification.show(`Blueprint error: ${error}`, "ERROR");
        return;
    }
    instructions.push(...value?.instructions ?? []);

    const message = {
        instructions,
        spellData: {
            name: spellID,
            caster: playerID
        }
    };
    OBR.broadcast.sendMessage(MESSAGE_CHANNEL, message, { destination: "ALL" });
}

function enforceSpellRules(targets: Target[], minTargets?: number, maxTargets?: number) {
    if (minTargets != undefined && targets.length < minTargets) {
        return `Please select at least ${minTargets} target(s) (${targets.length} selected)`;
    }

    if (maxTargets != undefined && targets.length > maxTargets) {
        return `Please select at most ${maxTargets} target(s) (${targets.length} selected)`;
    }

    return null;
}

function tokenMatchStrength(casterToken: SimplifiedItem, token: Image) {
    if (casterToken.image.url !== token.image.url) {
        return 0;
    }
    let strength = 0;
    if (token.visible) {
        strength += 100;
    }
    if (casterToken.name === token.name) {
        strength++;
    }
    if (casterToken.grid.dpi === token.grid.dpi) {
        strength++;
    }
    if (casterToken.grid.offset.x === token.grid.offset.x && casterToken.grid.offset.y === token.grid.offset.y) {
        strength++;
    }
    if (casterToken.image.height === token.image.height) {
        strength++;
    }
    if (casterToken.image.width === token.image.width) {
        strength++;
    }
    return strength;
}

async function setFirstTarget(firstTargetIsCasterBP: BlueprintValue<boolean> | undefined, targets: Target[], parameters: Record<string, unknown>, replicationType: ReplicationType, maxTargets?: number) {
    const variables: Variables = {
        targets,
        ...parameters
    };

    const { value, error } = resolveSimpleValue(firstTargetIsCasterBP, "firstTargetIsCaster", "boolean", variables);
    if (error) {
        log_error(error);
    }
    const firstTargetIsCaster = value ?? replicationType === "first_to_all";
    if (!firstTargetIsCaster) {
        return;
    }
    if (maxTargets && targets.length >= maxTargets) {
        return;
    }

    const casterTokens = getSettingsValue(LOCAL_STORAGE_KEYS.DEFAULT_CASTER);
    if (casterTokens == undefined || casterTokens.length == 0) {
        return;
    }

    if (targets.length > 0 && targets[0].id) {
        const possibleCasterToken = (await OBR.scene.items.getItems([targets[0].id]))[0];
        if (possibleCasterToken && isImage(possibleCasterToken)) {
            for (const casterToken of casterTokens) {
                if (tokenMatchStrength(casterToken, possibleCasterToken)) {
                    // Player still selected themselves
                    return;
                }
            }
        }
    }

    // Let's try to find the caster
    const items = await OBR.scene.items.getItems();
    let match: Item|undefined = undefined;
    let matchStrength = 0;

    for (const item of items) {
        if (!isImage(item)) {
            continue;
        }
        for (const casterToken of casterTokens) {
            const strength = tokenMatchStrength(casterToken, item);
            if (strength > matchStrength) {
                matchStrength = strength;
                match = item;
            }
        }
    }

    if (match !== undefined) {
        // We found a match, add it to targets
        targets.unshift({
            id: match.id,
            count: 1,
            position: match.position,
            size: getItemSize(match)
        });
    }
}

export async function doSpell(spellID: string, playerID: string, isGM: boolean) {
    const spell = getSpell(spellID, isGM);
    if (spell == undefined) {
        log_error(`Unknown spell "${spellID}"`);
        return;
    }
    const settingsGridScaleFactor = getSettingsValue(LOCAL_STORAGE_KEYS.GRID_SCALING_FACTOR);
    const gridScaleFactorPromise = settingsGridScaleFactor != null ? new Promise(resolve => resolve(settingsGridScaleFactor)) : getDefaultGridScaleFactor();
    const [targets, gridScaleFactor] = await Promise.all([getSortedTargets(), gridScaleFactorPromise]);
    if (!getSettingsValue(LOCAL_STORAGE_KEYS.KEEP_SELECTED_TARGETS)) {
        OBR.scene.local.deleteItems(targets.map(item => item.id));
    }

    const replicationType = spell.replicate ?? "no";
    const copyDelay = spell.copy ?? 150;
    const parameterValuesString = localStorage.getItem(`${APP_KEY}/spell-parameters/${spellID}`);

    const parameterValues = parameterValuesString ? JSON.parse(parameterValuesString) : {};
    for (const parameter of spell.parameters ?? []) {
        if (parameterValues[parameter.id] == undefined) {
            parameterValues[parameter.id] = parameter.defaultValue;
        }
        if (parameter.id === "radius" || parameter.id === "length" || parameter.id === "size") {
            // FIXME: this doesn't seem like a clean way to do it
            parameterValues[parameter.id] *= gridScaleFactor as number;
        }
    }

    const instructions: EffectInstruction[] = [];
    const interactionIds = new Set<string>();
    let interactionCount = 0;
    const variables: Variables[] = [];
    const targetObjects = targets.map(target => itemToTarget(target));

    await setFirstTarget(spell.firstTargetIsCaster, targetObjects, parameterValues, replicationType, spell.maxTargets);
    replicateSpell(variables, targetObjects, parameterValues, replicationType);
    copySpellVariables(variables, copyDelay);

    const error = enforceSpellRules(targetObjects, spell.minTargets, spell.maxTargets);
    if (error) {
        OBR.notification.show(error, "ERROR");
        return;
    }

    for (const variableSet of variables) {
        // Add all targets back into variableSet
        variableSet.globalTargets = targetObjects;
        const { value, error } = resolveBlueprint(spell.blueprints ?? [], variableSet);
        if (error) {
            OBR.notification.show(`Blueprint error: ${error}`, "ERROR");
            return;
        }
        instructions.push(...value?.instructions ?? []);
        for (const interaction of value?.interactions?.ids ?? []) {
            interactionIds.add(interaction);
        }
        interactionCount += value?.interactions?.count ?? 0;
    }

    copySpellInstructions(instructions, copyDelay);

    const message = {
        instructions,
        interactions: {
            ids: Array.from(interactionIds.values()),
            count: interactionCount,
        },
        spellData: {
            name: spellID,
            caster: playerID
        }
    };
    OBR.broadcast.sendMessage(MESSAGE_CHANNEL, message, { destination: "ALL" });
}
