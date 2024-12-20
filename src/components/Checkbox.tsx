import "./Checkbox.css";

export interface CheckboxProps {
    checked: boolean;
    setChecked: (checked: boolean) => void;
    label?: string;
}

export default function Checkbox(props: CheckboxProps) {

   return <div className="container" onClick={() => props.setChecked(!props.checked)}>
        <input 
            type="checkbox"
            checked={props.checked}
            readOnly
        />
        <span className="checkmark" />
    </div>;
}
