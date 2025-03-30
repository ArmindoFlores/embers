import "./AssetPicker.css";

import OBR, { ImageAssetType, ImageDownload } from "@owlbear-rodeo/sdk";

import { useCallback } from "react";

export interface AssetPickerProps {
    value: ImageDownload[];
    setValue: (value: ImageDownload[]) => void;
    multiple?: boolean;
    defaultSearch?: string;
    typeHint?: ImageAssetType;
}

export default function AssetPicker(props: AssetPickerProps) {
    const handlePickAsset = useCallback(() => {
        OBR.assets.downloadImages(props.multiple, props.defaultSearch, props.typeHint).then(assets => {
            props.setValue(assets);
        });
    }, [props]);

    return <div className="asset-picker-container" onClick={handlePickAsset}>
        <p>
            { props.value.length == 0 && "No assets selected" }
            { props.value.length > 0 && props.value.map(asset => asset.name).join(", ") }
        </p>
    </div>;
}
