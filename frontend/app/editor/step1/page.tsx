import EditorFlow from "@/components/editor/EditorFlow";

export default function Step1() {
  return (
    <EditorFlow
      headerStep={1}
      initialMode="lyrics"
      availableModes={["lyrics"]}
      backHref="/"
      nextHref="/editor/step2"
      showModeTabs={false}
    />
  );
}
