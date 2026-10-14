# Kit lessons: link-button.mjs

The long comments cut from `demo/shell/link-button.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-link-button.md#<anchor>`.

<a id="header"></a>

## link-button.mjs, file header

demo/shell/link-button.mjs: a button that reads as a link.

  const more = createLinkButton({ label: 'See details', onPress: () => open() });
  head.append(title, more.el);

Asked 2026-10-10: *"create linkbutton component, but it next to patchbay
comppnent title See details"*. It is a real `<button>`, because what it does
is an action on this page (open a panel), not a navigation, and a button is
what a keyboard and a screen reader expect for that. It only LOOKS like a
link: no face, no border, no box, the words underlined, so it can sit in a
line of text beside a heading without becoming a second control row.
⚠️ STYLED IN `shell.css` (`button.pos-linkbtn`), beside the small button,
like every other control; this file draws nothing of its own.
⚠️ `expanded` IS FOR A BUTTON THAT SHOWS AND HIDES SOMETHING: it sets
`aria-expanded`, so a screen reader says whether the thing is open.
