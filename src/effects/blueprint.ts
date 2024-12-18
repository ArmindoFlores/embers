import { AOEEffectBlueprint, ConeBlueprint, EffectBlueprint, ProjectileBlueprint } from "../types/blueprint";
import { EffectInstruction, MessageType } from "../types/messageListener";

import { AOEEffectMessage } from "../types/aoe";
import { ConeMessage } from "../types/cone";
import { ProjectileMessage } from "../types/projectile";
import { Vector2 } from "@owlbear-rodeo/sdk";
import { log_error } from "../logging";

function parseExpression(expression: string, variables: Record<string, unknown>) {
    const exprRegex = /^\$([a-zA-Z_]+)(?:\[(-?\d+)\])?$/;
    const match = exprRegex.exec(expression);
    if (match == null) {
        log_error(`Invalid blueprint: malformatted expression "${expression}"`);
        return undefined;
    }
    const [variableName, variableIndexString] = [match[1], match[2]];
    if (variables[variableName] == undefined) {
        log_error(`Invalid blueprint: undefined variable "${variableName}"`);
        return undefined;
    }
    const index = variableIndexString == undefined ? undefined : parseInt(variableIndexString);
    const tempVariable = variables[variableName];

    let element = undefined;
    if (index != undefined) {
        if (!Array.isArray(tempVariable)) {
            log_error(`Invalid blueprint: trying to index non-array variable "${variableName}"`);
            return undefined;
        }
        const realIndex = index >= 0 ? index : tempVariable.length + index;
        if (realIndex < 0) {
            log_error(`Invalid blueprint: index ${variableName}[${index}] out of range (length is ${tempVariable.length})`);
            return undefined;
        }
        element = tempVariable[realIndex];
    }
    else {
        element = tempVariable;
    }
    return element;
}

function parseBlueprint(element: EffectBlueprint, message: EffectInstruction[], variables: Record<string, unknown>) {
    if (element.effectId != undefined && typeof element.effectId !== "string") {
        log_error(`Invalid blueprint: effectId must be a string or undefined, not "${typeof element.effectId}"`);
        return false;
    }
    const effectId = element.effectId;

    let delay: number|undefined;
    if (element.delay != undefined) {
        if (typeof element.delay === "number") {
            delay = element.delay;
        }
        else if (typeof element.delay === "string") {
            delay = parseExpression(element.delay, variables);
            if (delay == undefined) {
                return false;
            }
        }
        else {
            log_error("Invalid blueprint: delay must be a number");
            return false;
        }
    }

    let effectInfo: ProjectileMessage | AOEEffectMessage | ConeMessage;
    if (element.effectInfo == undefined) {
        log_error("Invalid blueprint: missing effectInfo");
        return false;
    }
    const ukEffectInfo = element.effectInfo as unknown;
    if (
        (ukEffectInfo as ProjectileBlueprint).copies != undefined && 
        (ukEffectInfo as ProjectileBlueprint).source != undefined && 
        (ukEffectInfo as ProjectileBlueprint).destination != undefined
    ) {
        const pbEffectInfo = ukEffectInfo as ProjectileBlueprint;

        let copies: number = 0;
        if (typeof pbEffectInfo.copies === "number") {
            copies = pbEffectInfo.copies;
        }
        else if (typeof pbEffectInfo.copies === "string") {
            copies = parseExpression(pbEffectInfo.copies, variables);
        }
        else {
            log_error(`Invalid blueprint: effectInfo.copies must be a number, not "${typeof pbEffectInfo.copies}"`);
            return false;
        }

        let source: Vector2 =  { x: 0, y: 0 };
        if (typeof pbEffectInfo.source === "string") {
            source = parseExpression(pbEffectInfo.source, variables);
        }
        else if (typeof pbEffectInfo.source.x === "number" && typeof pbEffectInfo.source.y === "number") {
            source.x = pbEffectInfo.source.x;
            source.y = pbEffectInfo.source.y;
        }
        else {
            log_error(`Invalid blueprint: effectInfo.source must be of the form { x: number, y: number }`);
            return false;
        }

        let destination: Vector2 =  { x: 0, y: 0 };
        if (typeof pbEffectInfo.destination === "string") {
            destination = parseExpression(pbEffectInfo.destination, variables);
        }
        else if (typeof pbEffectInfo.destination.x === "number" && typeof pbEffectInfo.destination.y === "number") {
            destination.x = pbEffectInfo.destination.x;
            destination.y = pbEffectInfo.destination.y;
        }
        else {
            log_error(`Invalid blueprint: effectInfo.destination must be of the form { x: number, y: number }`);
            return false;
        }

        effectInfo = {
            copies,
            source,
            destination
        };
    }
    else if (
        (ukEffectInfo as ConeBlueprint).source != undefined && 
        (ukEffectInfo as ConeBlueprint).destination != undefined
    ) {
        const cbEffectInfo = ukEffectInfo as ConeBlueprint;

        let source: Vector2 =  { x: 0, y: 0 };
        if (typeof cbEffectInfo.source === "string") {
            source = parseExpression(cbEffectInfo.source, variables);
        }
        else if (typeof cbEffectInfo.source.x === "number" && typeof cbEffectInfo.source.y === "number") {
            source.x = cbEffectInfo.source.x;
            source.y = cbEffectInfo.source.y;
        }
        else {
            log_error(`Invalid blueprint: effectInfo.source must be of the form { x: number, y: number }`);
            return false;
        }

        let destination: Vector2 =  { x: 0, y: 0 };
        if (typeof cbEffectInfo.destination === "string") {
            destination = parseExpression(cbEffectInfo.destination, variables);
        }
        else if (typeof cbEffectInfo.destination.x === "number" && typeof cbEffectInfo.destination.y === "number") {
            destination.x = cbEffectInfo.destination.x;
            destination.y = cbEffectInfo.destination.y;
        }
        else {
            log_error(`Invalid blueprint: effectInfo.destination must be of the form { x: number, y: number }`);
            return false;
        }

        effectInfo = {
            source,
            destination
        };
    }
    else if (
        (ukEffectInfo as AOEEffectBlueprint).position != undefined
    ) {
        const abEffectInfo = ukEffectInfo as AOEEffectBlueprint;

        let position: Vector2 =  { x: 0, y: 0 };
        if (typeof abEffectInfo.position === "string") {
            position = parseExpression(abEffectInfo.position, variables);
        }
        else if (typeof abEffectInfo.position.x === "number" && typeof abEffectInfo.position.y === "number") {
            position.x = abEffectInfo.position.x;
            position.y = abEffectInfo.position.y;
        }
        else {
            log_error(`Invalid blueprint: effectInfo.position must be of the form { x: number, y: number }`);
            return false;
        }

        effectInfo = {
            position
        };
    }
    else {
        log_error("Invalid blueprint: effectInfo cannot be parsed");
        return false;
    }

    if (element.instructions != undefined && !Array.isArray(element.instructions)) {
        log_error(`Invalid blueprint: instructions must be an array, not "${typeof element.instructions}"`);
        return;
    }

    const instructions: EffectInstruction[] = [];
    if (element.instructions != undefined) {
        _realiseBlueprint(element.instructions, instructions, variables);
    }

    const newInstruction: EffectInstruction = {
        effectId,
        effectInfo,
        delay,
        instructions
    };
    message.push(newInstruction);
    return true;
}

function _realiseBlueprint(blueprint: EffectBlueprint[], message: EffectInstruction[], variables: Record<string, unknown>) {
    if (!Array.isArray(blueprint)) {
        log_error("Invalid blueprint: blueprint must be an array");
        return false;
    }

    for (const instruction of blueprint) {
        if (!parseBlueprint(instruction, message, variables)) {
            return false;
        }
    }
    return true;
}

export function realiseBlueprint(blueprint: string|object, variables: Record<string, unknown>) {
    try {
        const blueprintJSON = (typeof blueprint === "string" ? JSON.parse(blueprint) : blueprint) as EffectBlueprint[];
        const message: MessageType = { instructions: [] };

        const success = _realiseBlueprint(blueprintJSON, message.instructions, variables);
        return { message, success };
    }
    catch (e: unknown) {
        log_error(`Invalid blueprint: error while parsing JSON (${(e as Error).message})`);
        return { message: [], success: false };
    }
}

/*
[
 {
  "effectId": "magic_missile",
  "effectInfo": {
    "copies": 3,
    "source": "$target[0]",
    "destination": "$target[1]"
  }
 }
]

[
 {
  "effectId": "divine_smite_caster",
  "effectInfo": {
    "position": "$targets[0]"
  }
 },
 {
  "effectId": "divine_smite_target",
  "delay": 2000,
  "effectInfo": {
    "position": "$targets[-1]"
  }
 }
]
*/