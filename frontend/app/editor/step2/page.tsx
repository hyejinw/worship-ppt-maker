import EditorFlow from "@/components/editor/EditorFlow";

export default function Step2() {
  return (
    <EditorFlow
      headerStep={2}
      initialMode="slides"
      availableModes={["slides"]}
      backHref="/editor/step1"
      nextHref="/editor/step3"
      showModeTabs={false}
    />
  );
}
