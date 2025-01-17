import "./Docs.css";

export default function Docs() {
    return <div className="docs-container">
        <a href="/" className="subtle-link row">
            <img src="embers.svg" className="docs-title-icon"></img>
            <p className="docs-title">Embers</p>
        </a>
        <hr className="docs-divider"></hr>
        <div className="docs-body">
            <p className="docs-p">
                Embers is an Owlbear Rodeo extension that allows you to play animated spells and abilities.
                It uses the animated assets generously provided by <a href="https://jb2a.com/">JB2A</a>, under the Creative Commons License Attribution-NonCommercial CC BY-NC-SA (click <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">here</a> to know more about this).
            </p>
            <br></br>
            <p className="docs-p">
                These pages contain documentation about the Embers API that allows other Owlbear Rodeo extensions to talk to it,
                tutorials and other general information regarding its use, and listings of every available asset/function/action:
            </p>
            <br></br>
            <ul>
                <li>
                    <p className="docs-p">
                        <a href="/tutorials">
                            Tutorials
                        </a>
                    </p>
                </li>
                <li>
                    <p className="docs-p">
                        <a href="/listings">Assets, functions, and actions listing</a>
                    </p>
                </li>
                <li>
                    <p className="docs-p">
                        Embers API (to be added)
                    </p>
                </li>
            </ul>
            <br></br>
            <p className="docs-p">
                You can view this extensio on <a href="https://github.com/ArmindoFlores/embers">GitHub</a>. If you find an issue, have a suggestion, or just need help regarding some feature,
                please reach out to me on the <a href="https://discord.gg/u5RYMkV98s">official Owlbear Rodeo discord</a>.
            </p>
        </div>
    </div>;
}
