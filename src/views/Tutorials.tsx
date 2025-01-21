import "./Docs.css";

export default function Tutorials() {
    return <div className="docs-container">
        <a href="/" className="subtle-link row">
            <img src="embers.svg" className="docs-title-icon"></img>
            <p className="docs-title">Embers</p>
        </a>
        <hr className="docs-divider"></hr>
        <div className="docs-body">
            <p className="docs-subtitle">
                Tutorials
            </p>
            <br></br>
            <p className="docs-subsubtitle">
                Basic Tutorial
            </p>
            <p className="docs-p">
                Coming soon!
            </p>
            <br></br>
            <p className="docs-subsubtitle">
                Spellbook Tutorial
            </p>
            <p className="docs-p">
                Coming soon!
            </p>
            <br></br>
            <p className="docs-subsubtitle">
                Custom Spells Tutorial
            </p>
            <p className="docs-p">
                Embers allows you to create your own custom spells based on the effects already available.
                To do this, you will need to open Embers' extension panel and select the "+" icon on the top tabs.
            </p>
            <img src="custom-spells-1.png" style={{maxWidth: "90vw"}}></img>
            <p className="docs-p">
                You can click on the first button after "Custom Spells" to add a completely new spell.
                However, most of the time, it will be easier to start with an already existing spell by clicking the next button.
                The third button can be used to import a previously exported list of custom spells, and they can be exported using the next button.
                Finally, the last button deletes all your custom spells; be careful not to lose your work!
            </p>
            <br></br>
            <p className="docs-p">
                When editing a spell, you will be presented with the following window:
            </p>
            <img src="custom-spells-2.png" style={{maxWidth: "90vw"}}></img>
            <p className="docs-p">
                The first few fields are pretty straightforward: you can give your spell a name and a unique ID, as well as specify the minimum
                and maximum number of targets users should select.
            </p>
            <p className="docs-p">
                The replication mode describes what happens when more than one target is selected:
            </p>
            <ul>
                <li><p className="docs-p">When it is set to "No", then the spell will have access to the complete array fo targets (this will be described a bit below)</p></li>
                <li><p className="docs-p">When it is set to "All", the array of targets will always only contain one element, but the spell will be repeated for each selected target</p></li>
                <li><p className="docs-p">
                    Finally, a replication mode of "Origin to others" will repeat the spell of every target beyond the first,
                    and the array of targets will always contain the first target as the first element of the array, and the
                    current target as the second
                </p></li>
            </ul>
            <p className="docs-p">
                For example: the spell "Bless" has a replication mode of "All", since each effect only needs to know about one target, and then it is the same
                for all other targets; on the other hand, "Magic Missiles" has a replication mode of "Origin to all", since each missile will go from the caster
                to its intended target.
            </p>
            <br></br>
            <p className="docs-p">
                The copy value describes how long to wait between each spell replica, also counting the number of times a target was selected.
                When this value is not defined, selectign a target multiple times will have no effect. A negative value will cause all effect
                instances to be spawned at the same time.
            </p>
            <br></br>
            <p className="docs-p">
                After defining these initial parameters, it is time to add instructions on what effects and actions are to be performed by this spell.
                When you click on the "+" icon after "Blueprints", you will add a new effect. You can change this to be an action by clicking on the
                dropdown.
                You can delete any effect you don't want by using the "Trash" icon, and clicking on the pencil icon will allow you to edit an effect.
            </p>
            <img src="custom-spells-3.png" style={{maxWidth: "90vw"}}></img>
            <p className="docs-p">
                When editing an effect, you can change the following properties:
            </p>
            <ul>
                <li><p className="docs-p">
                    Effect ID - this is the unique identifier of the effect you want to be played; click <a href="/listings">here</a> for a complete list of effects
                </p></li>
                <li><p className="docs-p">
                    Delay - how many milliseconds to wait from the start of the spell to play this effect
                </p></li>
                <li><p className="docs-p">
                    Duration - how long to play this effect for; you can leave this null if you want the effect to play for its full duration, or specify
                    a custom one; a negative value will make this play indefinitely
                </p></li>
                <li><p className="docs-p">
                    Loops - how many times to play this effect; can't specify both "loops" and "duration"
                </p></li>
                <li><p className="docs-p">
                    Disabled - if true, this effect will not be played
                </p></li>
                <li><p className="docs-p">
                    Disable Hit - if true, clicking on this effect won't selected it
                </p></li>
                <li><p className="docs-p">
                    Attached To - the ID of the item to attach this to; leave blank if it is not supposed to be attached
                </p></li>
                <li><p className="docs-p">
                    Layer - the layer where this effect will be played
                </p></li>
            </ul>
            <p className="docs-p">
                There are also additional properties you'll have to define depending on the type of effect you're using.
            </p>
            <br></br>
            <p className="docs-p">
                One of the most important things is to understand how editing values works.
                When you click on a value, you will be able to edit it, and can choose either a literal value, a variable, or a function.
                When you choose a literal value, you will be able to detail exactly what value you want, like "3", or "true".
                When you choose a variable, you will be able to access two arrays, targets and globalTargets;
                globalTargets always includes all selected targets. Their elements have 4 properties:
            </p>
            <ul>
                <li><p className="docs-p">id - the ID of the targeted item</p></li>
                <li><p className="docs-p">size - the size of the targeted item</p></li>
                <li><p className="docs-p">position - the position of the targeted item</p></li>
                <li><p className="docs-p">count - the number of times the item was targeted</p></li>
            </ul>
            <p className="docs-p">
                You can use all of these like <span className="code">targets[0].position</span>, <span className="code">targets.length</span>, etc...
            </p>
            <p className="docs-p">
                When you select a function, the output of that function will become the value of this field.
                Each function has a supported number of arguments and types detailed <a href="/listings">here</a>.
            </p>
            <br></br>
            <p className="docs-p">
                Editing actions functions much the same as editing a function.
            </p>
        </div>
    </div>;
}
