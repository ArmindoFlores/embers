import { Spell, Spells } from "../types/spells";
import { getSortedTargets, getTargetCount } from "../effectsTool";
import { log_error, log_info } from "../logging";

import { EffectInstruction } from "../types/messageListener";
import { MESSAGE_CHANNEL } from "../components/MessageListener";
import OBR from "@owlbear-rodeo/sdk";
import { Variables } from "../types/blueprint";
import { getItemSize } from "../utils";
import { resolveBlueprint } from "./blueprint";
import spellsJSON from "../assets/spells_record.json";

export const spells = spellsJSON as Spells;
export const spellIDs = Object.keys(spells);

export function getSpell(spellID: string): Spell|undefined {
    return spells[spellID];
}

export function doSpell(spellID: string) {
    const spell = getSpell(spellID);
    if (spell == undefined) {
        log_error(`Unknown spell "${spellID}"`);
        return;
    }
    getSortedTargets().then(targets => {               
        OBR.scene.local.deleteItems(targets.map(item => item.id));

        const replicationType = spell.replicate ?? "no";


        const instructions: EffectInstruction[] = [];
        if (replicationType === "no") {            
            const variables: Variables = {
                targets: targets.map(target => ({
                    position: target.position,
                    size: getItemSize(target),
                    count: getTargetCount(target)
                }))
            };
            const { value, error } = resolveBlueprint(spell.blueprints ?? [], variables);
            if (error) {
                OBR.notification.show(`Blueprint error: ${error}`, "ERROR");
                return;
            }
            instructions.push(...value?.instructions ?? []);
        }
        else if (replicationType === "all") {
            for (const target of targets) {
                const variables: Variables = {
                    targets: [{
                        position: target.position,
                        size: getItemSize(target),
                        count: getTargetCount(target)
                    }]
                };
                const { value, error } = resolveBlueprint(spell.blueprints ?? [], variables);
                if (error) {
                    OBR.notification.show(`Blueprint error: ${error}`, "ERROR");
                    return;
                }
                instructions.push(...value?.instructions ?? []);
            }
        }
        else if (replicationType === "first_to_all") {
            const firstTarget = targets[0];
            log_info("Replication mode is first_to_all");
            for (const target of targets.slice(1)) {
                log_info(`Replicating for ${target}`)
                const variables: Variables = {
                    targets: [
                        {
                            position: firstTarget.position,
                            size: getItemSize(firstTarget),
                            count: getTargetCount(firstTarget)
                        },
                        {
                            position: target.position,
                            size: getItemSize(target),
                            count: getTargetCount(target)
                        }
                    ]
                };
                const { value, error } = resolveBlueprint(spell.blueprints ?? [], variables);
                if (error) {
                    OBR.notification.show(`Blueprint error: ${error}`, "ERROR");
                    return;
                }
                instructions.push(...value?.instructions ?? []);
            }
        }

        OBR.broadcast.sendMessage(MESSAGE_CHANNEL, { instructions  }, { destination: "ALL" });
    });
}
