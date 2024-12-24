import "./AddSpell.css";

import { BlueprintValue, EffectBlueprint } from "../types/blueprint";
import { FaArrowLeft, FaPencil, FaTrash } from "react-icons/fa6";
import { isBlueprintFunction, isBlueprintVariable, isUnresolvedBlueprint } from "../effects/blueprint";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EffectType } from "../types/effects";
import { Vector2 } from "@owlbear-rodeo/sdk";
import { getSpell } from "../effects/spells";

interface CombinedEffectPropertiesType {
    source?: BlueprintValue<Vector2>;
    destination?: BlueprintValue<Vector2>;
    position?: BlueprintValue<Vector2>;
    size?: BlueprintValue<number>;
    copies?: BlueprintValue<number>;
}

interface Editable {
    type: "effect" | "action" | "value" | "spell";
    index?: number;
    key?: string[];
}

interface IndexedObject { 
    [key: string]: IndexedObject 
};

function getNumberSetter(numberSetter: (v: number|null) => void) {
    function setter(value: string|null) {
        if (value == null) {
            numberSetter(null);
            return;
        }
        const intValue = parseInt(value);
        if (isNaN(intValue)) {
            numberSetter(null);
        }
        else {
            numberSetter(intValue);
        }
    }
    return setter;
}

function BlueprintValueCell<T>(
    { 
        keys, 
        value, 
        onChange, 
        pushEditStack,
        popEditStack
    }: { 
        keys: string[], 
        value: BlueprintValue<T>|undefined, 
        onChange: (v: BlueprintValue<T>|undefined) => void, 
        pushEditStack: (e: Editable) => void,
        popEditStack: () => void,
    }
) {
    const editValue = useCallback(() => {
        pushEditStack({ type: "value", key: keys })
    }, [keys, pushEditStack]);

    return <div className="blueprint-value-cell" onClick={editValue}>
        {
            value != undefined && isUnresolvedBlueprint(value) ?
            <p className="non-selectable">
                {
                    isBlueprintFunction(value) ?
                    <p><em>function</em> {value.name}(...)</p>
                    :
                    <p><em>variable</em> {value.substring(1)} </p>
                }
            </p>
            :
            <p className="non-selectable">{ String(value) }</p>
        }
    </div>;
}

function EditValueBlueprint<T>(
    { 
        value,
        onChange,
        pushEditStack,
        popEditStack 
    }: { 
        value: BlueprintValue<T>|undefined,
        onChange: (v: BlueprintValue<T>|undefined) => void,
        pushEditStack: (e: Editable) => void,
        popEditStack: () => void 
    }
) {
    const [functionName, setFunctionName] = useState<string|null>(null);
    const [functionArguments, setArguments] = useState<BlueprintValue<unknown>[]>([]);
    const [inputValue, setValue] = useState<string|null>(null);
    const [valueType, setValueType] = useState<"value"|"function"|"variable">();

    useEffect(() => {
        if (value != undefined && isBlueprintFunction(value)) {
            setFunctionName(value.name);
            setArguments(value.arguments);
            setValueType("function");
        }
        else if (value != undefined && isBlueprintVariable(value)) {
            setValue(value);
            setValueType("variable")
        }
        else {
            setValue(JSON.stringify(value));
            setValueType("value");
        }
    }, [value]);

    return <div className="spell-creation-edit-blueprint">
        <div className="row">
            <FaArrowLeft onClick={popEditStack} style={{cursor: "pointer"}} />
            <p className="title">Editing Value</p>
        </div>
        {
            valueType === "function" && 
            <div>
                <label htmlFor="function-name">
                    <p>Function name </p>
                    <input className="medium" name="function-name" value={functionName ?? ""} onChange={event => setFunctionName(event.target.value)} />
                </label>
                <hr style={{margin: "0.5rem 0px"}}></hr>
                {
                    functionArguments.map((arg, i) => (
                        <label key={i} htmlFor="function-name">
                            <p>Argument #{i+1} </p>
                            <BlueprintValueCell 
                                keys={["arguments", i.toString()]}
                                value={arg}
                                onChange={argValue => setArguments(old => [...old.slice(0, i), argValue, ...old.slice(i+1)])}
                                pushEditStack={pushEditStack}
                                popEditStack={popEditStack}
                            />
                        </label>
                    ))
                }
            </div>
        }
        {   
            valueType === "variable" && 
            <div>
                <p>Variable</p>
                <input className="medium" name="value" value={inputValue ?? ""} onChange={event => setValue(event.target.value)} />
            </div>
        }
        {
            valueType === "value" &&
            <div>
                <label htmlFor="value">
                    <p>Value</p>
                    <input className="medium" name="value" value={inputValue ?? ""} onChange={event => setValue(event.target.value)} />
                </label>
            </div>
        }
    </div>;
}

function EditEffectBlueprint(
    { 
        blueprint,
        setBlueprint,
        pushEditStack,
        popEditStack 
    }: { 
        blueprint: EffectBlueprint,
        setBlueprint: (blueprint: EffectBlueprint) => void,
        pushEditStack: (e: Editable) => void,
        popEditStack: () => void
    }
) {
    const [effectType, setEffectType] = useState<EffectType>("TARGET");
    const [effectID, setEffectID] = useState<EffectBlueprint["id"]>();
    const [delay, setDelay] = useState<EffectBlueprint["delay"]>();
    const [duration, setDuration] = useState<EffectBlueprint["duration"]>();
    const [combinedEffectProperties, setCombinedEffectProperties] = useState<CombinedEffectPropertiesType>({});

    const setEPSource = useCallback((source: BlueprintValue<Vector2>|undefined) => {
        setCombinedEffectProperties(old => ({ ...old, source }));
    }, []);

    const setEPDestination = useCallback((destination: BlueprintValue<Vector2>|undefined) => {
        setCombinedEffectProperties(old => ({ ...old, destination }));
    }, []);

    const setEPPosition = useCallback((position: BlueprintValue<Vector2>|undefined) => {
        setCombinedEffectProperties(old => ({ ...old, position }));
    }, []);

    const setEPSize = useCallback((size: BlueprintValue<number>|undefined) => {
        setCombinedEffectProperties(old => ({ ...old, size }));
    }, []);

    const setEPCopies = useCallback((copies: BlueprintValue<number>|undefined) => {
        setCombinedEffectProperties(old => ({ ...old, copies }));
    }, []);
    
    useEffect(() => {
        setEffectID(blueprint.id);
        setDelay(blueprint.delay);
        setDuration(blueprint.duration);
        setCombinedEffectProperties(blueprint.effectProperties ?? {});

        return () => {
            // if (effectID == undefined) {
            //     return;
            // }

            // setBlueprint({
            //     ...blueprint,
            //     id: effectID,
            //     delay: delay
            // });
        }
    }, [blueprint]);

    return <div className="spell-creation-edit-blueprint">
        <div className="row">
            <FaArrowLeft onClick={popEditStack} style={{cursor: "pointer"}} />
            <p className="title">Editing Effect</p>
        </div>
        <div className="spell-creation-edit-blueprint-values">
            <div className="row">
                <p className="subtitle">Effect ID</p>
                <BlueprintValueCell
                    pushEditStack={pushEditStack}
                    popEditStack={popEditStack}
                    keys={["id"]}
                    value={effectID}
                    onChange={setEffectID}
                />
            </div>
            <div className="row">
                <p className="subtitle">Delay</p>
                <BlueprintValueCell
                    pushEditStack={pushEditStack}
                    popEditStack={popEditStack}
                    keys={["delay"]}
                    value={delay}
                    onChange={setDelay}
                />
            </div>
            <div className="row">
                <p className="subtitle">Duration</p>
                <BlueprintValueCell
                    pushEditStack={pushEditStack}
                    popEditStack={popEditStack}
                    keys={["duration"]}
                    value={duration}
                    onChange={setDuration}
                />
            </div>
            <hr style={{margin: "0.5rem 0px"}}></hr>
            <div className="row">
                <p className="title">Editing Properties&nbsp;</p>
                <select value={effectType} onChange={event => setEffectType(event.target.value as EffectType)}>
                    <option value="TARGET">Targetted</option>
                    <option value="CIRCLE">Circle</option>
                    <option value="CONE">Cone/Line</option>
                </select>
            </div>
            {
                effectType === "TARGET" && <div>
                    <div className="row">
                        <p className="subtitle">Source</p>
                        <BlueprintValueCell
                            pushEditStack={pushEditStack}
                            popEditStack={popEditStack}
                            keys={["effectProperties", "source"]}
                            value={combinedEffectProperties.source}
                            onChange={setEPSource}
                        />
                    </div>
                    <div className="row">
                        <p className="subtitle">Destination</p>
                        <BlueprintValueCell
                            pushEditStack={pushEditStack}
                            popEditStack={popEditStack}
                            keys={["effectProperties", "destination"]}
                            value={combinedEffectProperties.destination}
                            onChange={setEPDestination}
                        />
                    </div>
                    <div className="row">
                        <p className="subtitle">Copies</p>
                        <BlueprintValueCell
                            pushEditStack={pushEditStack}
                            popEditStack={popEditStack}
                            keys={["effectProperties", "copies"]}
                            value={combinedEffectProperties.copies}
                            onChange={setEPCopies}
                        />
                    </div>
                </div>
            }
            {
                effectType === "CIRCLE" && <div>
                    <div className="row">
                        <p className="subtitle">Position</p>
                        <BlueprintValueCell
                            pushEditStack={pushEditStack}
                            popEditStack={popEditStack}
                            keys={["effectProperties", "position"]}
                            value={combinedEffectProperties.position}
                            onChange={setEPPosition}
                        />
                    </div>
                    <div className="row">
                        <p className="subtitle">Size</p>
                        <BlueprintValueCell
                            pushEditStack={pushEditStack}
                            popEditStack={popEditStack}
                            keys={["effectProperties", "size"]}
                            value={combinedEffectProperties.size}
                            onChange={setEPSize}
                        />
                    </div>
                </div>
            }
            {
                effectType === "CONE" && <div>
                    <div className="row">
                        <p className="subtitle">Source</p>
                        <BlueprintValueCell
                            pushEditStack={pushEditStack}
                            popEditStack={popEditStack}
                            keys={["effectProperties", "source"]}
                            value={combinedEffectProperties.source}
                            onChange={setEPSource}
                        />
                    </div>
                    <div className="row">
                        <p className="subtitle">Destination</p>
                        <BlueprintValueCell
                            pushEditStack={pushEditStack}
                            popEditStack={popEditStack}
                            keys={["effectProperties", "destination"]}
                            value={combinedEffectProperties.destination}
                            onChange={setEPDestination}
                        />
                    </div>
                </div>
            }
        </div>
    </div>;
}

export default function AddSpell() {
    const [spellName, setSpellName] = useState<string|null>(null);
    const [spellID, setSpellID] = useState<string|null>(null);
    const [minTargets, _setMinTargets] = useState<number|null>(null);
    const [maxTargets, _setMaxTargets] = useState<number|null>(null);
    const [replicate, setReplicate] = useState<string|null>(null);
    const [copy, _setCopy] = useState<number|null>(null);
    const [blueprints, setBlueprints] = useState<EffectBlueprint[]>([]);
    const [editStack, setEditStack] = useState<Editable[]>([]);
    const [thumbnail, setThumbnail] = useState<string>();

    const setMinTargets = useMemo(() => getNumberSetter(_setMinTargets), []);
    const setMaxTargets = useMemo(() => getNumberSetter(_setMaxTargets), []);
    const setCopy = useMemo(() => getNumberSetter(_setCopy), []);

    const removeBlueprint = useCallback((index: number) => {
        setBlueprints((oldBlueprints) => 
            oldBlueprints.filter((_, i) => i !== index)
        );
    }, []);

    const SpellBlueprint = useCallback(({ blueprint, blueprintIndex }: { blueprint: EffectBlueprint, blueprintIndex: number }) => {
        return <div className="spell-creation-blueprint-container row">
            {
                blueprint.type === "effect" ? 
                <p className="non-selectable">Effect</p> : 
                <p className="non-selectable">Action</p>
            }
            <div className="spell-creation-blueprint-controls row">
                <FaPencil onClick={() => setEditStack(old => [...old, { type: blueprint.type, index: blueprintIndex }])} />  
                <FaTrash onClick={() => removeBlueprint(blueprintIndex)}/>  
            </div>
        </div>; 
    }, [removeBlueprint]);

    useEffect(() => {
        const spell = getSpell("misty_step");
        if (!spell) {
            return;
        }

        setSpellName(spell.name ?? null);
        setSpellID("misty_step");
        _setMinTargets(spell.minTargets ?? null);
        _setMaxTargets(spell.maxTargets ?? null);
        setReplicate(spell.replicate ?? null);
        _setCopy(spell.copy ?? null);
        setBlueprints(spell.blueprints ?? []);
        setThumbnail(`./${spell.thumbnail ?? ""}`);
    }, []);

    const lastEditable = editStack[editStack.length-1];
    if (lastEditable != undefined) {
        if (lastEditable.type === "effect") {
            return <EditEffectBlueprint 
                blueprint={blueprints[lastEditable.index!]} 
                setBlueprint={(blueprint: EffectBlueprint) => setBlueprints([...blueprints.slice(0, lastEditable.index!), blueprint, ...blueprints.slice(lastEditable.index!+1)])}
                pushEditStack={(e: Editable) => setEditStack(old => [...old, e])}
                popEditStack={() => setEditStack(old => { return old.slice(0, old.length-1) })}
            />;
        }
        else if (lastEditable.type === "value") {
            const blueprint = blueprints[editStack[0].index!];
            let value: IndexedObject|undefined = undefined;
            for (const stackElement of editStack.slice(1)) {
                for (const key of stackElement.key!) {
                    const operand = (value ?? blueprint) as IndexedObject;
                    value = operand[key];
                }
            }
            return <EditValueBlueprint
                value={value}
                pushEditStack={(e: Editable) => setEditStack(old => [...old, e])}
                popEditStack={() => setEditStack(old => { return old.slice(0, old.length-1) })}
            />;
        }
    }

    return <div>
        <div className="spell-creation">
            <div className="spell-creation-header">
                <div className="row spell-creation-first-row">
                    <div className="spell-creation-name-and-id">
                        <input className="medium" placeholder="Spell Name" value={spellName ?? ""} onChange={event => setSpellName(event.target.value)} />
                        <input className="medium" placeholder="spell_id" value={spellID ?? ""} onChange={event => setSpellID(event.target.value)} />
                    </div>
                    <img className="spell-creation-thumbnail" src={thumbnail}/>
                </div>
                <div className="row spell-creation-targets">
                    <label htmlFor="min-targets">
                        <p>Min. targets </p>
                        <input className="small" name="min-targets" type="number" value={minTargets ?? ""} onChange={event => setMinTargets(event.target.value)} min="1" />
                    </label>
                    <label htmlFor="max-targets">
                        <p>Max. targets </p>
                        <input className="small" name="max-targets" type="number" value={maxTargets ?? ""} onChange={event => setMaxTargets(event.target.value)} min="1" />
                    </label>
                </div>
                <div className="row spell-creation-replication">
                    <label htmlFor="replicate">
                        <p>Replicate </p>
                        <select value={replicate ?? ""} onChange={event => setReplicate(event.target.value)}>
                            <option value="no">No</option>
                            <option value="all">All</option>
                            <option value="first-to-all">Origin to others</option>
                        </select>
                    </label>
                    <label htmlFor="copy">
                        <p>Copy </p>
                        <input className="small" name="copy" type="number" value={copy ?? ""} onChange={event => setCopy(event.target.value)} />
                    </label>
                </div>
            </div>
            <hr style={{margin: "0.5rem 0px"}}></hr>
        </div>
        <div className="spell-creation-blueprints">
            {
                blueprints.map((blueprint, i) => (
                    <SpellBlueprint key={i} blueprint={blueprint} blueprintIndex={i} />
                ))
            }
        </div>
    </div>;
}
