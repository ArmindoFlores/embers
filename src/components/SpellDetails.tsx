import "./SpellDetails.css";

import { NumberContent, OptionsContent, Parameter, ReplicationType, Spell } from "../types/spells";
import OBR, { Metadata } from "@owlbear-rodeo/sdk";
import { useCallback, useEffect, useState } from "react";

import { APP_KEY } from "../config";
import { getSpell } from "../effects/spells";
import { toolMetadataSelectedSpell } from "../effectsTool";
import { useOBR } from "../react-obr/providers";

function replicationValue(replicationValue: ReplicationType) {
    if (replicationValue === "no") {
        return "None";
    }
    else if (replicationValue === "all") {
        return "All";
    }
    else if (replicationValue === "first_to_all") {
        return "Origin to others"
    }
    return "?";
}

function copyValue(copyDelay: number) {
    if (copyDelay < 0) {
        return "None";
    }
    else if (copyDelay === 0) {
        return "Instant";
    }
    else if (copyDelay > 0) {
        return `Delayed (${copyDelay}ms)`;
    }
    return "?";
}

function DetailRow({ label, value }: { label: string, value: string}) {
    return <div className="spell-details-row">
        <p className="label">{ label }</p>
        <p>{ value }</p>
    </div>;
}

function ParameterRow({ spellID, parameter }: { spellID: string, parameter: Parameter }) {
    const [parameterValue, setParameterValue] = useState<string|null>(null);
    const [inputValue, setInputValue] = useState<string|null>(null);

    const setValidatedParameterValue = useCallback((value: string) => {
        const content = (parameter.content as NumberContent);
        const intValue = parseInt(value ?? "0");
        if (isNaN(intValue)) {
            setInputValue(parameterValue);
            return;
        }
        let realValue = intValue.toString();
        if (content.min && intValue < content.min) {
            realValue = content.min.toString();
        }
        else if (content.max && intValue > content.max) {
            realValue = content.max.toString();
        }
        setParameterValue(realValue);
        setInputValue(realValue);
    }, [parameter.content, parameterValue]);

    useEffect(() => {
        const spellParameters = localStorage.getItem(`${APP_KEY}/spell-parameters/${spellID}`);
        if (spellParameters) {
            const parameters = JSON.parse(spellParameters);
            const value = parameters[parameter.id];
            if (value) {
                setParameterValue(parameter.type === "options" ? value : value.toString());
                if (parameter.type === "number") {
                    setInputValue(value.toString());
                }
            }
        }
    }, [parameter, spellID]);

    useEffect(() => {
        if (parameterValue === null) {
            return;
        }
        const spellParameters = localStorage.getItem(`${APP_KEY}/spell-parameters/${spellID}`);
        if (spellParameters) {
            const parameters = JSON.parse(spellParameters);
            parameters[parameter.id] = parameter.type === "options" ? parameterValue : parseInt(parameterValue ?? parameter.defaultValue);
            localStorage.setItem(`${APP_KEY}/spell-parameters/${spellID}`, JSON.stringify(parameters));
        }
        else {
            localStorage.setItem(`${APP_KEY}/spell-parameters/${spellID}`, JSON.stringify({ [parameter.id]: parameterValue }));
        }
    }, [parameter, spellID, parameterValue]);

    return <div className="spell-details-row">
        <p className="label">{ parameter.name }</p>
        {
            parameter.type === "options" && (
                <select value={parameterValue ?? parameter.defaultValue as string} onChange={e => setParameterValue(e.target.value)}>
                    {
                        (parameter.content as OptionsContent).map(option => <option key={option.label} value={option.value}>
                            { option.label }
                        </option>)
                    }
                </select>
            )
        }
        {
            parameter.type === "number" && (
                <input 
                    className="settings-input"
                    type="number"
                    value={inputValue ?? (parameter.defaultValue as number).toString()}
                    min={(parameter.content as NumberContent).min}
                    max={(parameter.content as NumberContent).max}
                    onChange={e => setValidatedParameterValue(e.currentTarget.value)}
                    onInput={e => setInputValue(e.currentTarget.value)}
                />
            )
        }
    </div>;
}

export default function SpellDetails() {
    const obr = useOBR();
    const [selectedSpellID, setSelectedSpellID] = useState<string>();
    const [selectedSpell, setSelectedSpell] = useState<Spell>();

    useEffect(() => {
        if (!obr.ready) {
            return;
        }

        const setSelected = (metadata: Metadata) => {
            const selectedSpell = metadata?.[toolMetadataSelectedSpell];
            if (typeof selectedSpell == "string") {
                const spell = getSpell(selectedSpell);
                setSelectedSpell(spell);
                setSelectedSpellID(selectedSpell);
            }
        }

        OBR.player.getMetadata().then(setSelected);

        return OBR.player.onChange(player => setSelected(player.metadata));
    }, [obr.ready]);

    if (!selectedSpell) {
        return <p>No spell selected.</p>
    }

    return <div>
        <div className="spell-details-header">
            <div>
                <p className="title">{ selectedSpell.name }</p>
                <p>{ selectedSpellID }</p>
            </div>
            <img className="spell-details-thumbnail" src={`${window.location.origin}/${selectedSpell.thumbnail}`} />
        </div>
        <hr className="spell-details-divider" />
        {
            selectedSpell.minTargets != undefined && <DetailRow label="Minimum number of targets" value={selectedSpell.minTargets.toString()} />
        }
        {
            selectedSpell.maxTargets != undefined && <DetailRow label="Maximum number of targets" value={selectedSpell.maxTargets.toString()} />
        }
        {
            selectedSpell.replicate && <DetailRow label="Replication mode" value={replicationValue(selectedSpell.replicate)} />
        }
        {
            selectedSpell.copy != undefined && <DetailRow label="Copy mode" value={copyValue(selectedSpell.copy)} />
        }
        {
            selectedSpellID && selectedSpell.parameters && selectedSpell.parameters.map(
                parameter => <ParameterRow key={parameter.id} parameter={parameter} spellID={selectedSpellID} />
            )
        }
    </div>;
}
