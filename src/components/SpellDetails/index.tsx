import "./SpellDetails.css";

import { APP_KEY, ASSET_LOCATION } from "../../config";
import { Box, Typography } from "@mui/material";
import {
    NumberContent,
    OptionsContent,
    Parameter,
    ReplicationType,
    Spell,
} from "../../types/spells";
import OBR, { Metadata } from "@owlbear-rodeo/sdk";
import { useCallback, useEffect, useState } from "react";

import AssetPicker from "../AssetPicker";
import Checkbox from "../Checkbox";
import { FaCopy } from "react-icons/fa6";
import { SimplifiedItem } from "../../types/misc";
import { getSpell } from "../../effects/spells";
import { toolMetadataSelectedSpell } from "../../effectsTool";
import { useOBR } from "../../react-obr/providers";

function replicationValue(replicationValue: ReplicationType) {
    if (replicationValue === "no") {
        return "None";
    } else if (replicationValue === "all") {
        return "All";
    } else if (replicationValue === "first_to_all") {
        return "Origin to others";
    }
    return "?";
}

function copyValue(copyDelay: number) {
    if (copyDelay < 0) {
        return "None";
    } else if (copyDelay === 0) {
        return "Instant";
    } else if (copyDelay > 0) {
        return `Delayed (${copyDelay}ms)`;
    }
    return "?";
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="spell-details-row">
            <p className="label">{label}</p>
            <p>{value}</p>
        </div>
    );
}

function ParameterRow({
    spellID,
    parameter,
}: {
    spellID: string;
    parameter: Parameter;
}) {
    const [optionsValue, setOptionsValue] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState<string | null>(null);
    const [booleanValue, setBooleanValue] = useState<boolean | null>(null);
    const [assetValue, setAssetValue] = useState<SimplifiedItem[] | null>(null);

    const setValidatedParameterValue = useCallback(
        (value: string) => {
            const content = parameter.content as NumberContent;
            const intValue = parseInt(value ?? "0");
            if (isNaN(intValue)) {
                return;
            }
            let realValue = intValue.toString();
            if (content.min && intValue < content.min) {
                realValue = content.min.toString();
            } else if (content.max && intValue > content.max) {
                realValue = content.max.toString();
            }
            setInputValue(realValue);
        },
        [parameter.content]
    );

    useEffect(() => {
        const spellParameters = localStorage.getItem(
            `${APP_KEY}/spell-parameters/${spellID}`
        );
        if (spellParameters) {
            const parameters = JSON.parse(spellParameters);
            const value = parameters[parameter.id];
            if (value != undefined) {
                switch (parameter.type) {
                    case "options":
                        setOptionsValue(value);
                        break;
                    case "number":
                        setInputValue(value.toString());
                        break;
                    case "asset":
                        setAssetValue(value ?? []);
                        break;
                    case "boolean":
                        setBooleanValue(value);
                        break;
                    default:
                        setOptionsValue(value.toString());
                        break;
                }
            }
        }
    }, [parameter, spellID]);

    useEffect(() => {
        const spellParameters = localStorage.getItem(
            `${APP_KEY}/spell-parameters/${spellID}`
        );
        const parameters = spellParameters ? JSON.parse(spellParameters) : {};
        let update = true;
        switch (parameter.type) {
            case "options":
                update = optionsValue != null;
                parameters[parameter.id] = optionsValue;
                break;
            case "asset":
                update = assetValue != null;
                parameters[parameter.id] = assetValue;
                break;
            case "number":
                update = inputValue != null;
                parameters[parameter.id] = parseInt(inputValue ?? parameter.defaultValue as string);
                break;
            case "boolean":
                update = booleanValue != null;
                parameters[parameter.id] = booleanValue;
                break;
            default:
                update = optionsValue != null;
                parameters[parameter.id] = optionsValue;
                break;
        }
        if (update) {
            localStorage.setItem(
                `${APP_KEY}/spell-parameters/${spellID}`,
                JSON.stringify(parameters)
            );
        }
    }, [parameter, spellID, optionsValue, assetValue, inputValue, booleanValue]);

    return (
        <div className="spell-details-row">
            <p className="label">{parameter.name}</p>
            {parameter.type === "options" && (
                <select
                    className="small-select"
                    value={optionsValue ?? (parameter.defaultValue as string)}
                    onChange={(e) => setOptionsValue(e.target.value)}
                >
                    {(parameter.content as OptionsContent).map((option) => (
                        <option key={option.label} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            )}
            {parameter.type === "number" && (
                <input
                    className="settings-input"
                    type="number"
                    value={
                        inputValue ??
                        (parameter.defaultValue as number).toString()
                    }
                    min={(parameter.content as NumberContent).min}
                    max={(parameter.content as NumberContent).max}
                    onChange={(e) =>
                        setValidatedParameterValue(e.currentTarget.value)
                    }
                    onInput={(e) => setInputValue(e.currentTarget.value)}
                />
            )}
            {parameter.type === "boolean" && (
                <Checkbox
                    checked={booleanValue ?? (parameter.defaultValue as boolean|undefined) ?? false}
                    setChecked={(value) =>
                        setBooleanValue(value)
                    }
                />
            )}
            {parameter.type === "asset" && (
                <AssetPicker
                    value={assetValue ?? []}
                    setValue={setAssetValue}
                />
            )}
        </div>
    );
}

export default function SpellDetails() {
    const obr = useOBR();
    const [selectedSpellID, setSelectedSpellID] = useState<string>();
    const [selectedSpell, setSelectedSpell] = useState<Spell>();
    const [isGM, setIsGM] = useState(false);

    useEffect(() => {
        if (!obr.ready || !obr.player?.role) {
            return;
        }
        if (obr.player.role != "GM" && isGM) {
            setIsGM(false);
        } else if (obr.player.role == "GM" && !isGM) {
            setIsGM(true);
        }
    }, [obr.ready, obr.player?.role, isGM]);

    useEffect(() => {
        if (!obr.ready) {
            return;
        }

        const setSelected = (metadata: Metadata) => {
            const selectedSpell = metadata?.[toolMetadataSelectedSpell];
            if (typeof selectedSpell == "string") {
                const spell = getSpell(selectedSpell, isGM);
                setSelectedSpell(spell);
                setSelectedSpellID(selectedSpell);
            }
        };

        OBR.player.getMetadata().then(setSelected);

        return OBR.player.onChange((player) => setSelected(player.metadata));
    }, [obr.ready, isGM]);

    return (
        <Box>
            <Typography
                mb={"0.5rem"}
                variant="h6"
                className="title spellbook-options"
            >
                Spell Details
            </Typography>
            {!selectedSpell ? (
                <Typography variant="body2" sx={{ m: 1, mb: 0 }}>
                    No active spells. Select or add one from above! 🧙‍♂️🔥
                </Typography>
            ) : (
                <>
                    <div>
                        <div
                            className="spell-details-header"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                backgroundImage: `url(${ASSET_LOCATION}/${selectedSpell.thumbnail})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                padding: "1rem",
                            }}
                        >
                            <div>
                                <span
                                    className="title"
                                    style={{
                                        backgroundColor: "rgba(0, 0, 0, 0.75)", // Faded black background
                                        color: "white",
                                        padding: "0.5rem",
                                        borderRadius: "4px",
                                        display: "block",
                                        // flexDirection: "column",
                                    }}
                                >
                                    {selectedSpell.name}
                                    <Typography
                                        variant="body2"
                                        sx={{ ml: 0, textAlign: "start" }}
                                        display={"block"}
                                    >
                                        {selectedSpellID}
                                        <FaCopy
                                            style={{
                                                marginLeft: "0.5rem",
                                                cursor: "pointer",
                                            }}
                                            onClick={() => {
                                                // TODO: Add copy functionality to this whole thing
                                            }}
                                        />
                                    </Typography>
                                </span>
                            </div>
                            <img
                                className="spell-details-thumbnail"
                                src={`${ASSET_LOCATION}/${selectedSpell.thumbnail}`}
                            />
                        </div>
                        <hr
                            className="spell-details-divider"
                            style={{ marginBottom: "0.5rem" }}
                        />
                        {selectedSpell.minTargets != undefined && (
                            <DetailRow
                                label="Minimum number of targets"
                                value={selectedSpell.minTargets.toString()}
                            />
                        )}
                        {selectedSpell.maxTargets != undefined && (
                            <DetailRow
                                label="Maximum number of targets"
                                value={selectedSpell.maxTargets.toString()}
                            />
                        )}
                        {selectedSpell.replicate && (
                            <DetailRow
                                label="Replication mode"
                                value={replicationValue(
                                    selectedSpell.replicate
                                )}
                            />
                        )}
                        {selectedSpell.copy != undefined && (
                            <DetailRow
                                label="Copy mode"
                                value={copyValue(selectedSpell.copy)}
                            />
                        )}
                        {selectedSpellID &&
                            selectedSpell.parameters &&
                            selectedSpell.parameters.map((parameter) => (
                                <ParameterRow
                                    key={parameter.id}
                                    parameter={parameter}
                                    spellID={selectedSpellID}
                                />
                            ))}
                    </div>
                </>
            )}
        </Box>
    );
}
