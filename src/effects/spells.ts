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
import spellsJSON from "../assets/spells_record.json";

export const spells = spellsJSON as Spells;
export const spellIDs = Object.keys(spells);

function replicateSpell(variables: Variables[], targets: Item[], parameterValues: object, replicationType: ReplicationType) {
    if (replicationType === "no") {            
        variables.push({
            targets: targets.map(target => ({
                id: target.attachedTo,
                position: target.position,
                size: getItemSize(target),
                count: getTargetCount(target),
            })),
            ...parameterValues
        });
    }
    else if (replicationType === "all") {
        for (const target of targets) {
            variables.push({
                targets: [{
                    id: target.attachedTo,
                    position: target.position,
                    size: getItemSize(target),
                    count: getTargetCount(target),
                }],
                ...parameterValues
            });
        }
    }
    else if (replicationType === "first_to_all") {
        const firstTarget = targets[0];
        for (const target of targets.slice(1)) {
            variables.push({
                targets: [
                    {
                        id: target.attachedTo,
                        position: firstTarget.position,
                        size: getItemSize(firstTarget),
                        count: getTargetCount(firstTarget)
                    },
                    {
                        id: target.attachedTo,
                        position: target.position,
                        size: getItemSize(target),
                        count: getTargetCount(target),
                    }
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

export function getSpell(spellID: string): Spell|undefined {
    return spells[spellID];
}

export function doSpell(spellID: string, playerID: string) {
    const spell = getSpell(spellID);
    if (spell == undefined) {
        log_error(`Unknown spell "${spellID}"`);
        return;
    }
    getSortedTargets().then(targets => {               
        OBR.scene.local.deleteItems(targets.map(item => item.id));

        const replicationType = spell.replicate ?? "no";
        const copyDelay = spell.copy ?? 150;
        const parameterValuesString = localStorage.getItem(`${APP_KEY}/spell-parameters/${spellID}`);
        const parameterValues = parameterValuesString ? JSON.parse(parameterValuesString) : {};
        for (const parameter of spell.parameters ?? []) {
            if (parameterValues[parameter.id] == undefined) {
                parameterValues[parameter.id] = parameter.defaultValue;
            }
        }

        const instructions: EffectInstruction[] = [];
        const variables: Variables[] = [];
        replicateSpell(variables, targets, parameterValues, replicationType);
        copySpellVariables(variables, copyDelay);

        for (const variableSet of variables) {
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
