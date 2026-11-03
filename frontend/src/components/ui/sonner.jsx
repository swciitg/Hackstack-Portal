import { Toaster as Sonner } from "sonner";

const Toaster = (props) => {
return (
<Sonner
theme="light"
position="bottom-right"
{...props}
/>
);
};

export { Toaster };
