import { LOCAL_STORAGE_KEYS, getDefaultGridScaleFactor, getSettingsValue } from "../components/Settings";
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { ReplicationType, Spell, Spells } from "../types/spells";
import { getSortedTargets, getTargetCount } from "../effectsTool";

import { APP_KEY } from "../config";
import { EffectInstruction } from "../types/messageListener";
import { MESSAGE_CHANNEL } from "../components/MessageListener";
import { Variables } from "../types/blueprint";
import { getItemSize } from "../utils";
import { log_error } from "../logging";
import { resolveBlueprint } from "./blueprint";
import { spellListMetadataKey } from "../views/NewSpellModal";
import spellsJSON from "../assets/spells_record.json";

export const spells = spellsJSON as Spells;
export const spellIDs = Object.keys(spells);

function itemToTarget(item: Item) {
    return {
        id: item.attachedTo,
        position: item.position,
        size: getItemSize(item),
        count: getTargetCount(item)
    }
}

function replicateSpell(variables: Variables[], targets: Item[], parameterValues: object, replicationType: ReplicationType) {
    if (replicationType === "no") {
        variables.push({
            targets: targets.map(target => itemToTarget(target)),
            ...parameterValues
        });
    }
    else if (replicationType === "all") {
        for (const target of targets) {
            variables.push({
                targets: [itemToTarget(target)],
                ...parameterValues
            });
        }
    }
    else if (replicationType === "first_to_all") {
        const firstTarget = targets[0];
        if (targets.length === 1) {
            variables.push({
                targets: [itemToTarget(firstTarget)],
                ...parameterValues
            });
        }
        for (const target of targets.slice(1)) {
            variables.push({
                targets: [
                    itemToTarget(firstTarget),
                    itemToTarget(target)
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

export function doSpell(spellID: string, playerID: string, isGM: boolean) {
    const spell = getSpell(spellID, isGM);
    if (spell == undefined) {
        log_error(`Unknown spell "${spellID}"`);
        return;
    }
    const settingsGridScaleFactor = getSettingsValue(LOCAL_STORAGE_KEYS.GRID_SCALING_FACTOR);
    const gridScaleFactorPromise = settingsGridScaleFactor != null ? new Promise(resolve => resolve(settingsGridScaleFactor)) : getDefaultGridScaleFactor();
    Promise.all([getSortedTargets(), gridScaleFactorPromise]).then(([targets, gridScaleFactor]) => {
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
        const variables: Variables[] = [];
        replicateSpell(variables, targets, parameterValues, replicationType);
        copySpellVariables(variables, copyDelay);

        for (const variableSet of variables) {
            // Add all targets back into variableSet
            variableSet.globalTargets = targets.map(target => itemToTarget(target));
            const { value, error } = resolveBlueprint(spell.blueprints ?? [], variableSet);
            if (error) {
                OBR.notification.show(`Blueprint error: ${error}`, "ERROR");
                return;
            }
            instructions.push(...value?.instructions ?? []);
        }

        copySpellInstructions(instructions, copyDelay);

        const message = {
            instructions,
            spellData: {
                name: spellID,
                caster: playerID
            }
        };
        OBR.broadcast.sendMessage(MESSAGE_CHANNEL, message, { destination: "ALL" });
    });
}
