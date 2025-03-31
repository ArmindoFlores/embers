import "./AssetPicker.css";

import { CSSProperties, useCallback, useMemo } from "react";
import OBR, { ImageAssetType, ImageDownload } from "@owlbear-rodeo/sdk";

import { Button } from "@mui/material";
import { SimplifiedItem } from "../types/misc";

export interface AssetPickerProps {
    value: SimplifiedItem[];
    setValue: (value: ImageDownload[]) => void;
    multiple?: boolean;
    defaultSearch?: string;
    typeHint?: ImageAssetType;
    style?: CSSProperties;
}

export default function AssetPicker(props: AssetPickerProps) {
    const handlePickAsset = useCallback(() => {
        OBR.assets.downloadImages(props.multiple, props.defaultSearch, props.typeHint).then(assets => {
            props.setValue(assets);
        });
    }, [props]);

    const title = useMemo(() => {
        if (props.value.length === 0) {
            return "Select asset";
        }
        return `Select asset (${props.value.map(asset => asset.name).join(", ")})`;
    }, [props.value]);

    return <Button
        style={props.style}
        onClick={handlePickAsset}
        variant="outlined"
        color="primary"
        title={title}
    >
        <span style={{
            display: "inline-block",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            verticalAlign: "middle"
        }}>
            { title }
        </span>
    </Button>;
}
