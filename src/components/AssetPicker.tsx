import "./AssetPicker.css";

import { CSSProperties, useCallback } from "react";
import OBR, { ImageAssetType, ImageDownload } from "@owlbear-rodeo/sdk";

export interface AssetPickerProps {
    value: ImageDownload[];
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

    return <div style={props.style} className="asset-picker-container" onClick={handlePickAsset}>
        <p style={{margin: 0}}>
            { props.value.length == 0 && "No assets selected" }
            { props.value.length > 0 && props.value.map(asset => asset.name).join(", ") }
        </p>
    </div>;
}
