import Checkbox from "./Checkbox";
import { useState } from "react";

export default function Settings() {
    const [keepTargets, setKeepTargets] = useState(false);
    
    return <div>
        <div className="settings-menu">
            <div className="settings-item">
                <label htmlFor="recent-spells-list-size">
                    <p>Recent spells list size</p>
                </label>
                <input 
                    name="recent-spells-list-size" 
                    type="number"
                    className="settings-input"
                    defaultValue="10"
                />
            </div>
            <div className="settings-item">
                <label htmlFor="recent-spells-list-size">
                    <p>Keep selected targets</p>
                </label>
                <Checkbox checked={keepTargets} setChecked={setKeepTargets} />
            </div>
            <div className="settings-item">
                <label htmlFor="recent-spells-list-size">
                    <p>Players can cast spells</p>
                </label>
                <Checkbox checked={keepTargets} setChecked={setKeepTargets} />
            </div>
            <div className="settings-item">
                <label htmlFor="recent-spells-list-size">
                    <p>Summoned entities rule</p>
                </label>
                <input 
                    name="recent-spells-list-size" 
                    type="text"
                    className="settings-input"
                    defaultValue="GM Only"
                />
            </div>
        </div>
    </div>;
}
