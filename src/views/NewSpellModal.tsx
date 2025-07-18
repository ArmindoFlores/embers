import "./NewSpellModal.css";

import { AOEEffectBlueprint, BlueprintFunction, BlueprintType, BlueprintValue, EffectBlueprint, ProjectileBlueprint } from "../types/blueprint";
import { APP_KEY, ASSET_LOCATION } from "../config";
import { AssetContent, NumberContent, OptionsContent, Parameter, ParameterType, ReplicationType, Spell } from "../types/spells";
import { Effect, EffectType } from "../types/effects";
import { FaArrowLeft, FaCircleMinus, FaCirclePlus, FaFloppyDisk, FaPencil, FaTrash } from "react-icons/fa6";
import OBR, { Layer } from "@owlbear-rodeo/sdk";
import { effectNames, getEffect, getEffectURL, getVariantName } from "../effects";
import { isBlueprintVariable, isUnresolvedBlueprint } from "../effects/blueprint";
import { useCallback, useEffect, useMemo, useState } from "react";

import { actions } from "../effects/actions";
import { blueprintFunctions } from "../effects/blueprintFunctions";
import { getSpell } from "../effects/spells";
import { useOBR } from "../react-obr/providers";
import { useParams } from "react-router";

export const newSpellModalID = `${APP_KEY}/new-spell`;
export const spellListMetadataKey = `${APP_KEY}/spell-list`;
const LAYERS: Layer[] = ["ATTACHMENT", "CHARACTER", "CONTROL", "DRAWING", "FOG", "GRID", "MAP", "MOUNT", "NOTE", "POINTER", "POPOVER", "POST_PROCESS", "PROP", "RULER", "TEXT"];

type ValueType = "string" | "number" | "boolean" | "vector" | "effect" | "action" | "layer";

interface Editable<T = unknown> {
    type: "effect" | "action" | "value" | "spell" | "parameter";
    value: T;
    setValue: (v: T) => void;
    valueType?: ValueType;
}

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

function BlueprintValueInput<T>({
    value,
    setValue,
    setEditing,
    type
}: {
    value: BlueprintValue<T>|null,
    setValue: (v: T|null) => void,
    setEditing: (value: Editable<EffectBlueprint|BlueprintValue<unknown>>) => void,
    type?: ValueType
}) {
    const valueType = isUnresolvedBlueprint(value) ? (isBlueprintVariable(value) ? "variable" : "function") : typeof value;
    const onClick = useCallback(() => {
        setEditing({ type: "value", value, setValue: setValue as (v: BlueprintValue<unknown>) => void, valueType: type });
    }, [value, setValue, setEditing, type]);

    if (valueType === "variable") {
        return <div className="blueprint-value-cell" onClick={onClick}>
            <p><em>variable </em>{(value as string).substring(1)}</p>
        </div>;
    }
    if (valueType === "function") {
        return <div className="blueprint-value-cell" onClick={onClick}>
            <p><em>function </em>{(value as BlueprintFunction).name}()</p>
        </div>;
    }
    return <div className="blueprint-value-cell" onClick={onClick}>
        <p>
            {
                (type === "string" || type === "effect" || type === "action" || type === "layer") ?
                value == null ? "null" : `"${value}"` :
                type === "number" ?
                (value as number) ?? "null" :
                type === "vector" ?
                value == null ? "null" : `(${(value as unknown as { x: number, y: number }).x}, ${(value as unknown as { x: number, y: number }).y})` :
                value == null ? "null" : value ? "true" : "false"
            }
        </p>
    </div>;
}

function EditEffectValue({ value, setValue, close, type }: { value: BlueprintValue<unknown>, setValue: (v: BlueprintValue<unknown>) => void, close: () => void, type?: ValueType }) {
    const [valueType, setValueType] = useState<"value" | "variable" | "function">();
    const [currentValue, setCurrentValue] = useState<string|null>(null);
    const [currentUrl, setCurrentUrl] = useState<string|null>(null);
    const [currentBooleanValue, setCurrentBooleanValue] = useState<string>("null");
    const [currentVectorValue, setCurrentVectorValue] = useState<{ x: number, y: number }|null>(null);
    const [currentFunction, setCurrentFunction] = useState<BlueprintFunction>({ name: "", arguments: [] });
    const [datatype, setDatatype] = useState<ValueType|undefined>(type);
    const [editing, setEditing] = useState<Editable<EffectBlueprint|BlueprintValue<unknown>>>();

    const onClose = useCallback(() => {
        if (valueType === "value") {
            if (datatype === "string" || datatype === "effect" || datatype === "action" || datatype === "layer") {
                setValue(currentValue);
            }
            else if (datatype === "number") {
                const numberValue = parseFloat(currentValue ?? "");
                setValue(currentValue && !isNaN(numberValue) ? numberValue : null);
            }
            else if (datatype === "boolean") {
                setValue(currentBooleanValue === "null" ? null : currentBooleanValue === "true");
            }
            else if (datatype === "vector") {
                setValue(currentVectorValue);
            }
        }
        else if (valueType === "variable") {
            setValue(`$${currentValue}`);
        }
        else if (valueType === "function") {
            setValue(currentFunction);
        }
        close();
    }, [valueType, currentValue, currentBooleanValue, currentVectorValue, currentFunction, setValue, close, datatype]);

    useEffect(() => {
        if (isUnresolvedBlueprint(value)) {
            const newType = isBlueprintVariable(value) ? "variable" : "function";
            setValueType(newType);
            if (newType === "variable") {
                setCurrentValue((value as string).substring(1));
            }
            else {
                setCurrentFunction(value as BlueprintFunction);
            }
        }
        else {
            setValueType("value");
            if (type === "string" || type === "effect" || type === "action" || type === "layer") {
                setCurrentValue(value as string|null ?? "");
            }
            else if (type === "number") {
                setCurrentValue(value as number|null + "");
            }
            else if (type === "boolean") {
                const bv = value as boolean|null;
                setCurrentBooleanValue(bv == null ? "null" : bv ? "true" : "false");
            }
            else if (type === "vector") {
                setCurrentVectorValue(value as { x: number, y: number });
            }
        }
    }, [value, type]);

    useEffect(() => {
        setDatatype(type);
    }, [type]);

    useEffect(() => {
        setCurrentUrl(getEffectURL(currentValue+'', getVariantName(currentValue+'', 0)+'')+'')
    },[currentValue])

    if (editing != undefined) {
        if (editing.type === "value") {
            return <EditEffectValue value={editing.value} setValue={editing.setValue} close={() => setEditing(undefined)} type={editing.valueType} />;
        }
    }

    return <div className="edit-effect-value-modal">
        <p className="modal-title" style={{display: "flex", alignItems: "center"}}>
            <FaArrowLeft style={{marginRight: "0.5rem", cursor: "pointer"}} onClick={onClose} />
            Edit Value
        </p>
        <div>
            <div className="row">
            <label htmlFor="value" className="row" style={{justifyContent: "flex-start"}} title="Whether this represents a concrete value, a variable, or a function">
                    <p>Value type: </p>
                    <select value={valueType ?? "value"} onChange={event => setValueType(event.target.value as "value" | "variable" | "function")}>
                        <option value="value">Literal Value</option>
                        <option value="variable">Variable</option>
                        <option value="function">Function</option>
                    </select>
                </label>
                {
                    type == undefined && valueType === "value" &&
                    <label htmlFor="data" className="row" style={{justifyContent: "flex-start"}} title="The data type associated with this value">
                        <p>Datatype: </p>
                        <select value={datatype ?? ""} onChange={event => setDatatype(event.target.value as ValueType)}>
                            <option disabled={true} value="">Select a datatype</option>
                            <option value="number">Number</option>
                            <option value="string">String</option>
                            <option value="boolean">Boolean</option>
                            <option value="vector">Vector</option>
                        </select>
                    </label>
                }
            </div>
            <hr style={{margin: "0.5rem 0"}}></hr>
            {
                valueType === "value" && datatype !== "vector" ?

                <label htmlFor="value" className="row" title="The value for this field">
                    <p>Value </p>
                    {
                        datatype !== "boolean" && datatype !== "effect" && datatype !== "action" && datatype !== "layer" &&
                        <input value={currentValue ?? ""} onChange={event => setCurrentValue(event.target.value)} type={datatype == "number" ? "number": "text"} />
                    }
                    {
                        datatype === "effect" &&
                        <>
                        <select value={currentValue ?? ""} onChange={event => setCurrentValue(event.target.value)}>
                            <option value="" disabled>Select an effect</option>
                            {
                                effectNames.map(effect => <option key={effect} value={effect}>{ effect }</option>)
                            }
                        </select>
                        <div className="edit-thumbnail-preview">
                            <video src={`${currentUrl}`} autoPlay loop muted />
                        </div>
                        </>
                    }
                    {
                        datatype === "action" &&
                        <select value={currentValue ?? ""} onChange={event => setCurrentValue(event.target.value)}>
                            <option value="" disabled>Select an action</option>
                            {
                                Object.keys(actions).map(action => <option key={action} value={action}>{ action }</option>)
                            }
                        </select>
                    }
                    {
                        datatype === "layer" &&
                        <select value={currentValue ?? ""} onChange={event => setCurrentValue(event.target.value)}>
                            <option value="" disabled>Select a layer</option>
                            {
                                LAYERS.map(layer => <option key={layer} value={layer}>{ layer }</option>)
                            }
                        </select>
                    }
                    {
                        datatype === "boolean" &&
                        <select value={currentBooleanValue} onChange={event => setCurrentBooleanValue(event.target.value)}>
                            <option value="null">Null</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                        </select>
                    }
                </label> :

                valueType === "value" && datatype === "vector" ?

                <div className="row">
                    <label htmlFor="x" title="The first element of this vector">
                        <p>X </p>
                        <input
                            value={currentVectorValue?.x ?? ""}
                            onChange={event => setCurrentVectorValue(old => ({
                                x: event.target.value ? parseFloat(event.target.value) : 0,
                                y: old?.y ?? 0,
                            }))}
                            type="number"
                        />
                    </label>
                    <label htmlFor="y" title="The second element of this vector">
                        <p>Y </p>
                        <input
                            value={currentVectorValue?.y ?? ""}
                            onChange={event => setCurrentVectorValue(old => ({
                                x: old?.x ?? 0,
                                y: event.target.value ? parseFloat(event.target.value) : 0,
                            }))}
                            type="number"
                        />
                    </label>
                </div> :

                valueType === "variable" ?

                <label htmlFor="value" className="row" title="The name of this variable. You can use indexing and property access like 'targets[0].position'. These are resolved once a spell is cast">
                    <p>Variable </p>
                    <input value={currentValue ?? ""} onChange={event => setCurrentValue(event.target.value)} />
                </label> :

                valueType === "function" ?

                <div>
                    <label htmlFor="value" className="row" title="The function name and arguments that are run when this spell blueprint is resolving">
                        <p className="subtitle">Function </p>
                        <select value={currentFunction.name} onChange={event => setCurrentFunction({ ...currentFunction, name: event.target.value })}>
                            {
                                Object.keys(blueprintFunctions).map((name, i) => (
                                    <option key={i} value={name}>{name}</option>
                                ))
                            }
                        </select>
                    </label>
                    <p className="subtitle add-custom-spell" title="Add a new argument to this function">
                        Arguments
                        <FaCirclePlus
                            style={{marginLeft: "0.25rem", cursor: "pointer"}}
                            onClick={() => setCurrentFunction(old => ({ ...old,  arguments: [...old.arguments, undefined] }))}
                        />
                    </p>
                    <div>
                        {
                            currentFunction.arguments.map((arg, i) => {
                                let argType: ValueType|undefined = undefined;
                                if (arg != null) {
                                    if (!isUnresolvedBlueprint(arg)) {
                                        if (typeof arg === "string") {
                                            argType = "string";
                                        }
                                        else if (typeof arg === "number") {
                                            argType = "number";
                                        }
                                        else if (typeof arg === "boolean") {
                                            argType = "boolean";
                                        }
                                        else {
                                            argType = "vector";
                                        }
                                    }
                                }
                                return <label key={i} htmlFor={`arg-${i}`} className="row" title="The value of this function's argument">
                                    <p style={{ display: "flex", alignItems: "center" }}>
                                        <FaTrash
                                            style={{ cursor: "pointer", marginRight: "0.25rem" }}
                                            onClick={() => setCurrentFunction(old => ({ ...old, arguments: old.arguments.filter((_, j) => j !== i) }))}
                                        />
                                        Argument {i + 1}
                                    </p>
                                    <BlueprintValueInput
                                        value={arg}
                                        setValue={v => setCurrentFunction({
                                            ...currentFunction,
                                            arguments: currentFunction.arguments.map((a, j) => i === j ? v : a)
                                        })}
                                        setEditing={setEditing}
                                        type={argType}
                                    />
                                </label>;
                            })
                        }
                    </div>
                </div> : null
            }
        </div>
    </div>;
}

function EditAction({ action, setAction, close }: { action: EffectBlueprint, setAction: (v: EffectBlueprint) => void, close: () => void }) {
    const [actionID, setActionID] = useState<BlueprintValue<string>|null>(null);
    const [disabled, setDisabled] = useState<BlueprintValue<boolean>|null>(null);
    const [delay, setDelay] = useState<BlueprintValue<number>|null>(null);
    const [actionArguments, setArguments] = useState<BlueprintValue<unknown>[]>([]);
    const [editing, setEditing] = useState<Editable<EffectBlueprint|BlueprintValue<unknown>>>();

    const onClose = useCallback(() => {
        if (actionID == null) {
            return;
        }

        setAction({
            id: actionID,
            type: "action",
            arguments: actionArguments,
            disabled: disabled != null ? disabled : undefined,
            delay: delay ?? undefined
        });

        close();
    }, [close, actionArguments, setAction, actionID, disabled, delay]);

    useEffect(() => {
        setActionID(action.id ?? null);
        setDisabled(action.disabled ?? null);
        setDelay(action.delay ?? null);
        setArguments(action.arguments ?? []);
    }, [action, setAction]);

    if (editing != undefined) {
        if (editing.type === "effect") {
            return <EditEffect effect={editing.value as EffectBlueprint} setEffect={editing.setValue} close={() => setEditing(undefined)} />;
        }
        else if (editing.type === "action") {
            return <EditAction action={editing.value as EffectBlueprint} setAction={editing.setValue} close={() => setEditing(undefined)} />;
        }
        else if (editing.type === "value") {
            return <EditEffectValue value={editing.value} setValue={editing.setValue} close={() => setEditing(undefined)} type={editing.valueType} />;
        }
    }

    return <div className="edit-effect-modal">
        <p className="modal-title" style={{display: "flex", alignItems: "center"}}>
            <FaArrowLeft style={{marginRight: "0.5rem", cursor: "pointer"}} onClick={onClose} />
            Edit Action
        </p>
        <p className="title">Details</p>
        <div className="row">
            <label htmlFor="action-id">
                <p>Action ID</p>
                <BlueprintValueInput value={actionID} setValue={setActionID} setEditing={setEditing} type="action" />
            </label>
            <label htmlFor="action-id">
                <p>Disabled</p>
                <BlueprintValueInput value={disabled} setValue={setDisabled} setEditing={setEditing} type="boolean" />
            </label>
        </div>
        <label htmlFor="action-id">
            <p>Delay</p>
            <BlueprintValueInput value={delay} setValue={setDelay} setEditing={setEditing} type="number" />
        </label>
        <p className="subtitle add-custom-spell" title="Add a new argument to this action">
            Arguments
            <FaCirclePlus
                style={{marginLeft: "0.25rem", cursor: "pointer"}}
                onClick={() => setArguments(old => [...old, undefined])}
            />
        </p>
        <div>
            {
                actionArguments.map((arg, i) => {
                    let argType: ValueType|undefined = undefined;
                    if (arg != null) {
                        if (!isUnresolvedBlueprint(arg)) {
                            if (typeof arg === "string") {
                                argType = "string";
                            }
                            else if (typeof arg === "number") {
                                argType = "number";
                            }
                            else if (typeof arg === "boolean") {
                                argType = "boolean";
                            }
                            else {
                                argType = "vector";
                            }
                        }
                    }
                    return <label key={i} htmlFor={`arg-${i}`} className="row" title="The value of this action's argument">
                        <p style={{ display: "flex", alignItems: "center" }}>
                            <FaTrash
                                style={{ cursor: "pointer", marginRight: "0.25rem" }}
                                onClick={() => setArguments(old => old.filter((_, j) => j !== i))}
                            />
                            Argument {i + 1}
                        </p>
                        <BlueprintValueInput
                            value={arg}
                            setValue={v => setArguments(old => old.map((a, j) => i === j ? v : a))}
                            setEditing={setEditing}
                            type={argType}
                        />
                    </label>;
                })
            }
        </div>
    </div>;
}

function EditParameter({ parameter, setParameter, close }: { parameter: Parameter, setParameter: (v: Parameter) => void, close: () => void }) {
    const [parameterID, setParameterID] = useState<string|null>(null);
    const [parameterType, setParameterType] = useState<ParameterType|null>(null);
    const [parameterName, setParameterName] = useState<string|null>(null);
    const [defaultValue, setDefaultValue] = useState<string|number|boolean|null>(null);
    const [numberContent, setNumberContent] = useState<NumberContent|null>(null);
    const [assetContent, setAssetContent] = useState<AssetContent|null>(null);
    const [optionsContent, setOptionsContent] = useState<OptionsContent|null>(null);

    const onClose = useCallback(() => {
        if (parameterID == null) {
            return;
        }

        let content = undefined;
        switch (parameterType) {
            case "asset":
                content = assetContent;
                break;
            case "number":
                content = numberContent;
                break;
            case "options":
                content = optionsContent;
                break;
        }

        setParameter({
            id: parameterID,
            type: parameterType ?? "options",
            name: parameterName ?? "",
            defaultValue: defaultValue,
            content: content ?? undefined
        });

        close();
    }, [close, parameterID, setParameter, parameterType, parameterName, defaultValue, assetContent, numberContent, optionsContent]);

    useEffect(() => {
        setParameterID(parameter.id ?? null);
        setParameterType(parameter.type);
        setParameterName(parameter.name);
        setDefaultValue(parameter.defaultValue as (string|number|boolean|null|undefined) ?? null);
        if (parameter.content != undefined) {
            if (parameter.type === "asset") {
                setAssetContent(parameter.content as AssetContent);
            }
            else if (parameter.type === "number") {
                setNumberContent(parameter.content as NumberContent);
            }
            else if (parameter.type === "options") {
                setOptionsContent(parameter.content as OptionsContent);
            }
        }
    }, [parameter, setParameter]);

    return <div className="edit-parameter-modal">
        <p className="modal-title" style={{display: "flex", alignItems: "center"}}>
            <FaArrowLeft style={{marginRight: "0.5rem", cursor: "pointer"}} onClick={onClose} />
            Edit Parameter
        </p>
        <p className="title">Details</p>
        <div className="row">
            <div>
                <label htmlFor="parameter-id"><p>Parameter ID</p></label>
                <input name="parameter-id" value={parameterID ?? ""} onChange={e => setParameterID(e.target.value)}></input>
            </div>
            <div>
                <label htmlFor="parameter-name"><p>Parameter Name</p></label>
                <input name="parameter-name" value={parameterName ?? ""} onChange={e => setParameterName(e.target.value)}></input>
            </div>
        </div>
        <div className="row">
            <div>
                <label htmlFor="parameter-type"><p>Parameter Type</p></label>
                <select name="parameter-type" value={parameterType ?? ""} onChange={e => setParameterType(e.target.value as ParameterType)}>
                    <option value="" disabled>Select a type...</option>
                    <option value="number">Number</option>
                    <option value="options">Options</option>
                    <option value="asset">Asset</option>
                    <option value="boolean">Boolean</option>
                </select>
            </div>
            <div>
                <label htmlFor="default-value"><p>Default Value</p></label>
                {
                    parameterType == "number" &&
                    <input type="number" value={typeof defaultValue === "number" ? defaultValue : ""} onChange={e => setDefaultValue(parseFloat(e.target.value))}></input>
                }
                {
                    parameterType == "boolean" &&
                    <select value={typeof defaultValue === "boolean" ? (defaultValue ? "t" : "f") : ""} onChange={(e => setDefaultValue(e.target.value === "t"))} style={{width: "18.3rem"}}>
                        <option value="" disabled>Select a value...</option>
                        <option value="f">False</option>
                        <option value="t">True</option>
                    </select>
                }
                {
                    parameterType == "options" &&
                    <select style={{width: "18.3rem"}} value={typeof defaultValue === "string" ? defaultValue : ""} onChange={e => setDefaultValue(e.target.value)}>
                        <option value="" disabled>Select a default value...</option>
                        {
                            (optionsContent ?? []).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))
                        }
                    </select>
                }
                {
                    parameterType == "asset" &&
                    <p style={{width: "18rem"}}>Not possible to set</p>
                }
                {
                    parameterType == null &&
                    <p style={{width: "18rem"}}>Select a type</p>
                }
            </div>
        </div>
        <br></br>
        {
            parameterType != null && parameterType != "boolean" &&
            <p className="title">Settings</p>
        }
        <div>
            {
                parameterType == "number" && <div className="row">
                    <div>
                        <label htmlFor="min-value"><p>Minimum</p></label>
                        <input
                            name="min-value"
                            type="number"
                            value={numberContent?.min ?? ""}
                            onChange={e => e.target.value != "" ? setNumberContent(old => ({ ...old, min: parseFloat(e.target.value)})) : setNumberContent(old => ({ max: old?.max }))}
                        ></input>
                    </div>
                    <div>
                        <label htmlFor="max-value"><p>Maximum</p></label>
                        <input
                            name="max-value"
                            type="number"
                            value={numberContent?.max ?? ""}
                            onChange={e => e.target.value != "" ? setNumberContent(old => ({ ...old, max: parseFloat(e.target.value)})) : setNumberContent(old => ({ min: old?.min }))}
                        ></input>
                    </div>
                </div>
            }
            {
                parameterType == "asset" && <div className="row">
                    <div>
                        <label htmlFor="multiple"><p>Allow multiple selections</p></label>
                        <select name="multiple" value={assetContent?.multiple ? "t" : "f"} onChange={e => setAssetContent({multiple: e.target.value === "t"})}>
                            <option value="t">True</option>
                            <option value="f">False</option>
                        </select>
                    </div>
                </div>
            }
            {
                parameterType == "options" && <div>
                    {
                        (optionsContent ?? []).map((opt, i) => <div key={i} className="row">
                            <label>
                                <p>Label</p>
                                <input
                                    value={opt.label}
                                    onChange={e => setOptionsContent(old => {
                                        if (old == null) {
                                            return null;
                                        }
                                        const filtered = old.filter((_, idx) => idx != i);
                                        filtered.splice(i, 0, { value: opt.value, label: e.target.value });
                                        return filtered;
                                    })}
                                ></input>
                            </label>
                            <label>
                                <p>Value</p>
                                <input
                                    value={opt.value}
                                    onChange={e => setOptionsContent(old => {
                                        if (old == null) {
                                            return null;
                                        }
                                        const filtered = old.filter((_, idx) => idx != i);
                                        filtered.splice(i, 0, { value: e.target.value, label: opt.label });
                                        return filtered;
                                    })}
                                >
                                </input>
                            </label>
                            <FaCircleMinus
                                style={{ marginLeft: "0.25rem", cursor: "pointer" }}
                                onClick={() => setOptionsContent(old => old?.filter?.(o => o.value !== opt.value) ?? null)}
                            />
                        </div>)
                    }
                    <FaCirclePlus
                        style={{ marginLeft: "0.25rem", cursor: "pointer" }}
                        onClick={() => setOptionsContent(old => [...(old ?? []), { label: `Option #${old?.length ?? -1+1}`, value: `option-${old?.length ?? -1+1}`}])}
                    />
                </div>
            }
        </div>
    </div>;
}

function EditEffect({ effect, setEffect, close }: { effect: EffectBlueprint, setEffect: (v: EffectBlueprint) => void, close: () => void }) {
    const [effectID, setEffectID] = useState<BlueprintValue<string>|null>(null);
    const [attachedTo, setAttachedTo] = useState<BlueprintValue<string>|null>(null);
    // const [metadata, setMetadata] = useState<BlueprintValue<string>|null>(null);
    const [delay, setDelay] = useState<BlueprintValue<number>|null>(null);
    const [duration, setDuration] = useState<BlueprintValue<number>|null>(null);
    const [disableHit, setDisableHit] = useState<BlueprintValue<boolean>|null>(null);
    const [disabled, setDisabled] = useState<BlueprintValue<boolean>|null>(null);
    const [forceVariant, setForceVariant] = useState<BlueprintValue<number>|null>(null);
    const [layer, setLayer] = useState<BlueprintValue<Layer|null>>(null);
    const [loops, setLoops] = useState<BlueprintValue<number>|null>(null);
    const [blueprints, setBlueprints] = useState<EffectBlueprint[]>([]);
    const [effectType, setEffectType] = useState<EffectType>();
    const [effectProperties, setEffectProperties] = useState<EffectBlueprint["effectProperties"]|null>(null);
    const [editing, setEditing] = useState<Editable<EffectBlueprint|BlueprintValue<unknown>>>();

    const onClose = useCallback(() => {
        if (effectID == null) {
            return;
        }

        setEffect({
            id: effectID,
            attachedTo: attachedTo ?? undefined,
            delay: delay ?? undefined,
            duration: duration ?? undefined,
            loops: loops ?? undefined,
            disabled: disabled ?? undefined,
            disableHit: disableHit ?? undefined,
            layer: layer ?? undefined,
            blueprints,
            type: "effect",
            forceVariant: forceVariant ?? undefined,
            effectProperties: effectProperties ?? undefined
        });

        close();
    }, [close, attachedTo, blueprints, effectProperties, delay, duration, effectID, loops, disableHit, layer, setEffect, disabled, forceVariant]);

    useEffect(() => {
        setEffectID(effect.id ?? null);
        setAttachedTo(effect.attachedTo ?? null);
        setDelay(effect.delay ?? null);
        setDuration(effect.duration ?? null);
        setLoops(effect.loops ?? null);
        setDisabled(effect.disabled ?? null);
        setDisableHit(effect.disableHit ?? null);
        setBlueprints(effect.blueprints ?? []);
        setLayer(effect.layer ?? null);
        setForceVariant(effect.forceVariant ?? null);
        setEffectProperties(effect.effectProperties ?? null);
        if (effect.id && ! isUnresolvedBlueprint(effect.id)) {
            const effectDetails = getEffect(effect.id);
            if (effectDetails) {
                setEffectType(effectDetails.type);
            }
        }
    }, [effect, setEffect]);

    if (editing != undefined) {
        if (editing.type === "effect") {
            return <EditEffect effect={editing.value as EffectBlueprint} setEffect={editing.setValue} close={() => setEditing(undefined)} />;
        }
        else if (editing.type === "action") {
            return <EditAction action={editing.value as EffectBlueprint} setAction={editing.setValue} close={() => setEditing(undefined)} />;
        }
        else if (editing.type === "value") {
            return <EditEffectValue value={editing.value} setValue={editing.setValue} close={() => setEditing(undefined)} type={editing.valueType} />;
        }
    }

    return <div className="edit-effect-modal">
        <p className="modal-title" style={{display: "flex", alignItems: "center"}}>
            <FaArrowLeft style={{marginRight: "0.5rem", cursor: "pointer"}} onClick={onClose} />
            Edit Effect
        </p>
        <p className="title">Details</p>
        <div className="row">
            <label htmlFor="effect-id">
                <p>Effect ID</p>
                <BlueprintValueInput value={effectID} setValue={setEffectID} setEditing={setEditing} type="effect" />
            </label>
            <label htmlFor="delay" title="How long to wait before starting to play this effect">
                <p>Delay (ms)</p>
                <BlueprintValueInput value={delay} setValue={setDelay} setEditing={setEditing} type="number" />
            </label>
        </div>
        <div className="row">
            <label htmlFor="duration" title="How long to play this effect for. If unspecified, the effect plays for its duration once. Only 'duration' or 'loops' may be specified for an effect">
                <p>Duration (ms)</p>
                <BlueprintValueInput value={duration} setValue={setDuration} setEditing={setEditing} type="number" />
            </label>
            <label htmlFor="loops" title="How many times to play this effect for. If unspecified, defaults to 'duration'. Only 'duration' or 'loops' may be specified for an effect">
                <p>Loops </p>
                <BlueprintValueInput value={loops} setValue={setLoops} setEditing={setEditing} type="number" />
            </label>
        </div>
        <div className="row">
            <label htmlFor="disabled" title="If true, this effect won't be played. Useful if it should only be played conditionally">
                <p>Disabled</p>
                <BlueprintValueInput value={disabled} setValue={setDisabled} setEditing={setEditing} type="boolean" />
            </label>
            <label htmlFor="disable-hit" title="If true, this effect won't be hittable by the GM or players">
                <p>Disable hit</p>
                <BlueprintValueInput value={disableHit} setValue={setDisableHit} setEditing={setEditing} type="boolean" />
            </label>
        </div>
        <div className="row">
            <label htmlFor="attached-to" title="The ID of the item this item should be attached to">
                <p>Attached to</p>
                <BlueprintValueInput value={attachedTo} setValue={setAttachedTo} setEditing={setEditing} type="string" />
            </label>
            <label htmlFor="force-variant" title="For effects like magic missiles, where there are multiple variants, you can set this to a number to ensure the same one is always used">
                <p>Force variant</p>
                <BlueprintValueInput value={forceVariant} setValue={setForceVariant} setEditing={setEditing} type="boolean" />
            </label>
        </div>
        <div className="row">
            <label htmlFor="layer" title="The layer where this effect will be played">
                <p>Layer</p>
                <BlueprintValueInput value={layer} setValue={setLayer} setEditing={setEditing} type="layer" />
            </label>
            <label>
            </label>
        </div>
        <hr style={{margin: "0.5rem 0px"}}></hr>
        <div className="row">
            <p className="title">Effect Properties</p>
            <select value={effectType ?? ""} onChange={event => setEffectType(event.target.value as EffectType)}>
                <option disabled={true} value="">Select an effect type</option>
                <option value="TARGET">Projectile</option>
                <option value="WALL">Wall</option>
                <option value="CIRCLE">AOE</option>
                <option value="CONE">Cone</option>
            </select>
        </div>
        {
            (effectType === "TARGET" || effectType === "WALL") &&
            <div className="row">
                <label htmlFor="source" title="The source position of this effect">
                    <p>Source</p>
                    <BlueprintValueInput
                        value={(effectProperties as ProjectileBlueprint)?.source ?? null}
                        setValue={s => setEffectProperties({ ...effectProperties as ProjectileBlueprint, source: s! })}
                        setEditing={setEditing}
                        type="vector"
                    />
                </label>
                <label htmlFor="destination" title="The destination or end position of this effect">
                    <p>Destination</p>
                    <BlueprintValueInput
                        value={(effectProperties as ProjectileBlueprint)?.destination ?? null}
                        setValue={d => setEffectProperties({ ...effectProperties as ProjectileBlueprint, destination: d! })}
                        setEditing={setEditing}
                        type="vector"
                    />
                </label>
            </div>
        }
        {
            effectType === "TARGET" &&
            <div>
                <label htmlFor="copies" title="The number of copies to send to one specific target. For example, this could be '3' for a 1st level magic missiles">
                    <p>Copies</p>
                    <BlueprintValueInput
                        value={(effectProperties as ProjectileBlueprint)?.copies ?? null}
                        setValue={c => setEffectProperties({ ...effectProperties as ProjectileBlueprint, copies: c! })}
                        setEditing={setEditing}
                        type="number"
                    />
                </label>
            </div>
        }
        {
            (effectType === "CIRCLE" || effectType === "CONE") &&
            <div>
                <label htmlFor="source" title="The source position for this effect">
                    <p>Source</p>
                    <BlueprintValueInput
                        value={(effectProperties as AOEEffectBlueprint)?.source ?? null}
                        setValue={s => setEffectProperties({ ...effectProperties as AOEEffectBlueprint, source: s! })}
                        setEditing={setEditing}
                        type="vector"
                    />
                </label>
                <div className="row">
                    <label htmlFor="rotation" title="The rotation of this effect, in degrees">
                        <p>Rotation</p>
                        <BlueprintValueInput
                            value={(effectProperties as AOEEffectBlueprint)?.rotation ?? null}
                            setValue={r => setEffectProperties({ ...effectProperties as AOEEffectBlueprint, rotation: r ?? undefined })}
                            setEditing={setEditing}
                            type="number"
                        />
                    </label>
                    <label htmlFor="size" title="The size of this effect (in grid squares)">
                        <p>Size</p>
                        <BlueprintValueInput
                            value={(effectProperties as AOEEffectBlueprint)?.size ?? null}
                            setValue={s => setEffectProperties({ ...effectProperties as AOEEffectBlueprint, size: s! })}
                            setEditing={setEditing}
                            type="number"
                        />
                    </label>
                </div>
            </div>
        }
    </div>;
}

function EditThumbnail({ value, setValue, close }: { value: string|undefined, setValue: (v: string|undefined) => void, close: () => void }) {
    return <div className="edit-effect-modal">
        <p className="modal-title" style={{display: "flex", alignItems: "center"}}>
            <FaArrowLeft style={{marginRight: "0.5rem", cursor: "pointer"}} onClick={close} />
            Edit Thumbnail
        </p>
        <div className="edit-thumbnail-container" title="This thumbnail will be shown when selecting the spell">
            <p className="large">Select your thumbnail from the list below:</p>
            <select value={value} onChange={event => setValue(event.target.value)}>
                <option disabled value="">Select a thumbnail</option>
                {
                    effectNames.sort((a, b) => a.localeCompare(b)).map(effectId => [effectId, getEffect(effectId)]).map(([effectId, effect]) => (
                        <option key={effectId as string} value={(effect as Effect|undefined)?.thumbnail}>{ effectId as string }</option>
                    ))
                }
            </select>
        </div>
        <br></br>
        <div className="edit-thumbnail-preview">
            <img src={`${ASSET_LOCATION}/${value}`} />
        </div>
    </div>;
}

export default function NewSpellModal() {
    const obr = useOBR();
    const [spellName, setSpellName] = useState<string|null>(null);
    const [spellID, setSpellID] = useState<string|null>(null);
    const [minTargets, _setMinTargets] = useState<number|null>(null);
    const [maxTargets, _setMaxTargets] = useState<number|null>(null);
    const [replicate, setReplicate] = useState<string|null>(null);
    const [copy, _setCopy] = useState<number|null>(null);
    const [blueprints, setBlueprints] = useState<EffectBlueprint[]>([]);
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [thumbnail, setThumbnail] = useState<string>();
    const [editing, setEditing] = useState<Editable<Parameter> | Editable<EffectBlueprint>>();
    const [isGM, setIsGM] = useState(false);
    const [selectingThumbnail, setSelectingThumbnail] = useState<boolean>(false);

    const {spellID: querySpellID} = useParams();

    const setMinTargets = useMemo(() => getNumberSetter(_setMinTargets), []);
    const setMaxTargets = useMemo(() => getNumberSetter(_setMaxTargets), []);
    const setCopy = useMemo(() => getNumberSetter(_setCopy), []);

    const removeBlueprint = useCallback((index: number) => {
        setBlueprints((oldBlueprints) =>
            oldBlueprints.filter((_, i) => i !== index)
        );
    }, []);

    const removeParameter = useCallback((index: number) => {
        setParameters((oldParameters) =>
            oldParameters.filter((_, i) => i !== index)
        );
    }, []);

    const saveSpell = useCallback(() => {
        const spell: Spell = {
            name: spellName ?? undefined,
            minTargets: minTargets ?? undefined,
            maxTargets: maxTargets ?? undefined,
            replicate: replicate as ReplicationType|null ?? undefined,
            copy: copy ?? undefined,
            blueprints: blueprints,
            parameters: parameters,
            thumbnail: thumbnail
        };
        const spellJSON = JSON.stringify(spell);

        OBR.scene.getMetadata().then(metadata => {
            const localStorageSpellList = JSON.parse(localStorage.getItem(spellListMetadataKey) ?? "[]");
            localStorage.setItem(`${APP_KEY}/spells/${spellID}`, spellJSON);
            if (!localStorageSpellList.includes(spellID)) {
                localStorage.setItem(spellListMetadataKey, JSON.stringify([...localStorageSpellList, spellID]));
            }

            const metadataSpellList = metadata[spellListMetadataKey];
            const spellList = Array.isArray(metadataSpellList) ? metadataSpellList : [];
            if (!spellList.includes(spellID)) {
                OBR.scene.setMetadata({
                    [spellListMetadataKey]: [...spellList, spellID]
                });
            }
        });

        OBR.modal.close(newSpellModalID);
    }, [spellName, spellID, minTargets, maxTargets, replicate, copy, blueprints, parameters, thumbnail]);

    const SpellBlueprint = useCallback(({ blueprint, blueprintIndex }: { blueprint: EffectBlueprint, blueprintIndex: number }) => {
        function setValue(newBlueprint: EffectBlueprint) {
            setBlueprints(blueprints => blueprints.map((b, i) => i === blueprintIndex ? newBlueprint : b));
        }

        return <div className="spell-creation-blueprint-container row">
            <select value={blueprint.type} onChange={event => setValue({ ...blueprint, type: event.target.value as BlueprintType })} title="An effect is a playable video that is created in the scene; an action is performed on one or more items, and can be something like 'move' or 'hide'; a spell is a set of spells, actions, and effects">
                <option value="effect">Effect</option>
                <option value="action">Action</option>
                <option value="spell">Spell</option>
            </select>
            <div className="spell-creation-blueprint-controls row">
                <FaPencil
                    className="clickable"
                    onClick={() => setEditing({
                        type: blueprint.type,
                        value: blueprint,
                        setValue
                    })}
                    title={`Edit this ${blueprint.type}`}
                />
                <FaTrash className="clickable" onClick={() => removeBlueprint(blueprintIndex)} title={`Delete this ${blueprint.type}`} />
            </div>
        </div>;
    }, [removeBlueprint]);

    const SpellParameter = useCallback(({ parameter, parameterIndex }: { parameter: Parameter, parameterIndex: number }) => {
        function setValue(newParameter: Parameter) {
            setParameters(parameters => parameters.map((b, i) => i === parameterIndex ? newParameter : b));
        }

        return <div className="spell-creation-parameter-container row">
            <p>{ parameter.id }</p>
            <p>{ parameter.name }</p>
            <div className="spell-creation-parameter-controls row">
                <FaPencil
                    className="clickable"
                    onClick={() => setEditing({
                        type: "parameter",
                        value: parameter,
                        setValue
                    })}
                    title={`Edit this parameter`}
                />
                <FaTrash className="clickable" onClick={() => removeParameter(parameterIndex)} title="Delete this parameter" />
            </div>
        </div>;
    }, [removeParameter]);

    useEffect(() => {
        if (!obr.ready || !obr.player?.role) {
            return;
        }
        if (obr.player.role != "GM" && isGM) {
            setIsGM(false);
        }
        else if (obr.player.role == "GM" && !isGM) {
            setIsGM(true);
        }
    }, [obr.ready, obr.player?.role, isGM]);

    useEffect(() => {
        if (querySpellID == null) {
            return;
        }
        const spell = getSpell(querySpellID, isGM);
        if (!spell) {
            return;
        }

        setSpellName(spell.name ?? null);
        setSpellID(querySpellID.startsWith("$.") ? querySpellID.substring(2) : querySpellID);
        _setMinTargets(spell.minTargets ?? null);
        _setMaxTargets(spell.maxTargets ?? null);
        setReplicate(spell.replicate ?? null);
        _setCopy(spell.copy ?? null);
        setBlueprints(spell.blueprints ?? []);
        setParameters(spell.parameters ?? []);
        setThumbnail(spell.thumbnail);
        // setIsEditing(editing);

      }, [querySpellID, isGM]);

    if (editing != undefined) {
        if (editing.type === "effect") {
            const editingEffect = editing as Editable<EffectBlueprint>;
            return <EditEffect effect={editingEffect.value} setEffect={editingEffect.setValue} close={() => setEditing(undefined)} />;
        }
        else if (editing.type === "action") {
            const editingAction = editing as Editable<EffectBlueprint>;
            return <EditAction action={editingAction.value} setAction={editingAction.setValue} close={() => setEditing(undefined)} />;
        }
        else if (editing.type === "parameter") {
            const editingParameter = editing as Editable<Parameter>;
            return <EditParameter parameter={editingParameter.value} setParameter={editingParameter.setValue} close={() => setEditing(undefined)} />;
        }
    }

    if (selectingThumbnail) {
        return <EditThumbnail value={thumbnail} setValue={setThumbnail} close={() => setSelectingThumbnail(false)} />
    }

    return <div className="new-spell-modal">
        <p className="modal-title row">
            Create New Spell
            <FaFloppyDisk className={spellID != undefined ? "clickable" : undefined} onClick={saveSpell} style={{ color: spellID == undefined ? "gray" : undefined }} />
        </p>
        <div className="spell-creation">
            <div className="spell-creation-header">
                <div className="row spell-creation-first-row">
                    <div className="spell-creation-name-and-id">
                        <input className="medium" placeholder="Spell Name" value={spellName ?? ""} onChange={event => setSpellName(event.target.value)} title="The name of this spell, like 'Magic Missiles'" />
                        <input className="medium" placeholder="spell_id" value={spellID ?? ""} onChange={event => setSpellID(event.target.value)} title="The unique identifier for this spell, like 'magic_missiles'" />
                    </div>
                    <img className="spell-creation-thumbnail" src={`${ASSET_LOCATION}/${thumbnail}`} onClick={() => setSelectingThumbnail(true)} />
                </div>
                <div className="row spell-creation-targets">
                    <label htmlFor="min-targets" title="The minimum number of selected targets this spell requires">
                        <p>Min. targets </p>
                        <input className="small" name="min-targets" type="number" value={minTargets ?? ""} onChange={event => setMinTargets(event.target.value)} min="1" />
                    </label>
                    <label htmlFor="max-targets" title="The maximum number of selected targets this spell accepts">
                        <p>Max. targets </p>
                        <input className="small" name="max-targets" type="number" value={maxTargets ?? ""} onChange={event => setMaxTargets(event.target.value)} min="1" />
                    </label>
                </div>
                <div className="row spell-creation-replication">
                    <label htmlFor="replicate" title="No: The effect will run once and consider all selected targets;&#10;&#13;All: The effect will run once for each target, considering only one target at a time;&#10;&#13;Origin to others: The effect will run once for each target, not counting the first one, and will consider the first and the current target for each.">
                        <p>Replicate </p>
                        <select value={replicate ?? ""} onChange={event => setReplicate(event.target.value)}>
                            <option value="no">No</option>
                            <option value="all">All</option>
                            <option value="first_to_all">Origin to others</option>
                        </select>
                    </label>
                    <label htmlFor="copy" title="The delay between each copy of the projectile. For example, if sending 3 eldritch blasts at one target, you might want them to be separated by 200 milliseconds. If negative, copies beyond the first are ignored">
                        <p>Copy (ms) </p>
                        <input className="small" name="copy" type="number" value={copy ?? ""} onChange={event => setCopy(event.target.value)} />
                    </label>
                </div>
            </div>
            <hr style={{margin: "0.5rem 0px"}}></hr>
        </div>
        <div className="spell-creation-blueprints">
            <p className="subtitle add-custom-spell" title="Add a new spell, action, or effect">
                Blueprints
                <FaCirclePlus
                    style={{ marginLeft: "0.25rem", cursor: "pointer" }}
                    onClick={() => setBlueprints(old => [...old, { type: "effect", id: "", blueprints: [] }])}
                />
            </p>
            {
                blueprints.map((blueprint, i) => (
                    <SpellBlueprint key={i} blueprint={blueprint} blueprintIndex={i} />
                ))
            }
            <hr style={{margin: "0.5rem 0px"}}></hr>
        </div>
        <div className="spell-creation-parameters">
            <p className="subtitle add-custom-spell" title="Add parameters to be used by variables">
                Parameters
                <FaCirclePlus
                    style={{ marginLeft: "0.25rem", cursor: "pointer" }}
                    onClick={() => setParameters(old => [...old, { type: "options", id: `parameter-${old.length+1}`, name: `Parameter #${old.length+1}`, defaultValue: "" }])}
                />
            </p>
            {
                parameters.map((parameter, i) => (
                    <SpellParameter key={i} parameter={parameter} parameterIndex={i} />
                ))
            }
        </div>
    </div>;
}
