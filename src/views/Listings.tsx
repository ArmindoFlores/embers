import "./Docs.css";

import { effectNames, getEffect } from "../effects";

import { Effect } from "../types/effects";
import { actions } from "../effects/actions";
import { blueprintFunctions } from "../effects/blueprintFunctions";

const types = {
    "CIRCLE": "Area of effect",
    "TARGET": "Projectile",
    "CONE": "Cone",
    "WALL": "Wall"
};

export default function Listings() {
    return <div className="docs-container">
        <a href="/" className="subtle-link row">
            <img src="embers.svg" className="docs-title-icon"></img>
            <p className="docs-title">Embers</p>
        </a>
        <hr className="docs-divider"></hr>
        <div className="docs-body">
        <p className="docs-subtitle">
                Listings
            </p>
            <p className="docs-p">
                This page contains a listing of every available asset, function, and action in Embers.
                You can refer to it when creating new spells.
            </p>
            <br></br>
            <p className="docs-subsubtitle">
                Functions
            </p>
            <div>
                {
                    Object.entries(blueprintFunctions).map(([functionName, func]) => {
                        return <div key={functionName}>
                            <p className="bold docs-p">{ functionName }</p>
                            <p className="docs-p">{ func.desc.description ?? "" }</p>
                            <ul>
                                {
                                    func.desc.minArgs == func.desc.maxArgs && func.desc.minArgs != undefined &&
                                    <li>
                                        <p className="docs-p">
                                            Number of arguments: { func.desc.minArgs }
                                        </p>
                                    </li>
                                }
                                {
                                    func.desc.minArgs != func.desc.maxArgs && func.desc.minArgs != undefined &&
                                    <li>
                                        <p className="docs-p">
                                            Min. number of arguments: { func.desc.minArgs }
                                        </p>
                                    </li>
                                }
                                {
                                    func.desc.minArgs != func.desc.maxArgs && func.desc.maxArgs != undefined &&
                                    <li>
                                        <p className="docs-p">
                                            Max. number of arguments: { func.desc.maxArgs }
                                        </p>
                                    </li>
                                }
                                {
                                    func.desc.argumentType &&
                                    <li>
                                        <p className="docs-p">
                                            Arguments type: <span style={{fontStyle: "italic"}}>{ func.desc.argumentType }</span>
                                        </p>
                                    </li>
                                }
                                {
                                    func.desc.returnType &&
                                    <li>
                                        <p className="docs-p">
                                            Return type: <span style={{fontStyle: "italic"}}>{ func.desc.returnType }</span>
                                        </p>
                                    </li>
                                }
                            </ul>
                        </div>;
                    })
                }
            </div>
            <br></br>
            <p className="docs-subsubtitle">
                Actions
            </p>
            <div>
                {
                    Object.entries(actions).map(([actionName, action]) => {
                        return <div key={actionName}>
                            <p className="bold docs-p">{ actionName }</p>
                            <p className="docs-p">{ action.desc.description ?? "" }</p>
                            <ul>
                                {
                                    action.desc.minArgs == action.desc.maxArgs && action.desc.minArgs != undefined &&
                                    <li>
                                        <p className="docs-p">
                                            Number of arguments: { action.desc.minArgs }
                                        </p>
                                    </li>
                                }
                                {
                                    action.desc.minArgs != action.desc.maxArgs && action.desc.minArgs != undefined &&
                                    <li>
                                        <p className="docs-p">
                                            Min. number of arguments: { action.desc.minArgs }
                                        </p>
                                    </li>
                                }
                                {
                                    action.desc.minArgs != action.desc.maxArgs && action.desc.maxArgs != undefined &&
                                    <li>
                                        <p className="docs-p">
                                            Max. number of arguments: { action.desc.maxArgs }
                                        </p>
                                    </li>
                                }
                                {
                                    action.desc.argumentType &&
                                    <li>
                                        <p className="docs-p">
                                            Arguments type: <span style={{fontStyle: "italic"}}>{ action.desc.argumentType }</span>
                                        </p>
                                    </li>
                                }
                            </ul>
                        </div>;
                    })
                }
            </div>
            <br></br>
            <p className="docs-subsubtitle">
                Effects
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Spell ID</th>
                        <th>Type</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        effectNames.map(effectName => [effectName, getEffect(effectName)]).map(([effectID, effect]) => {
                            const durations = Object.values((effect as Effect).variants).map(variant => Math.max(...variant.duration));
                            return <tr key={effectID as string}>
                                <td style={{textAlign: "left"}}>{ effectID as string }</td>
                                <td>{ types[(effect as Effect).type as (keyof typeof types)]}</td>
                                <td>{ Math.max(...durations) } ms</td>
                            </tr>;
                        })
                    }
                </tbody>
            </table>
        </div>
    </div>;
}
