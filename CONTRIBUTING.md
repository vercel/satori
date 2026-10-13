# Satori Contribution Guidelines

Thank you for reading this guide and we appreciate any contribution.

## Ask a Question

You can use the repository's [Discussions](https://github.com/vercel/satori/discussions) page to ask any questions, post feedback, or share your experience on how you use this library.

## Report a Bug

Whenever you find something which is not working properly, please first search the repository's [Issues](https://github.com/vercel/satori/issues) page and make sure it's not reported by someone else already.

If not, feel free to open an issue with a detailed description of the problem and the expected behavior. A bug reproduction using [Satori’s playground](https://og-playground.vercel.app) will be extremely helpful.

## Request for a New Feature

For new features, it would be great to have some discussions from the community before starting working on it. You can either create an issue (if there isn't one) or post a thread on the [Discussions](https://github.com/vercel/satori/discussions) page to describe the feature that you want to have.

If possible, you can add another additional context like how this feature can be implemented technically, what other alternative solutions we can have, etc.

## Local Development

This project uses [pnpm](https://pnpm.io). To install dependencies, run:

```bash
pnpm install
```

This requires Node.js 20+, Python 3 and a C++ toolchain, because it compiles [headless-gl](https://github.com/encharm/headless-gl) (WebGL2 with SwiftShader), which the `<canvas>` tests use to run real shaders on the CPU.

To start the playground together with Satori locally, run:

```bash
pnpm dev:playground
```

And visit localhost:3000.

To only start the development mode of Satori, run `pnpm dev` in the root directory (recommended to test together with the playground to see changes in live).

## Adding Tests

Satori uses [Vitest](https://vitest.dev) to test and generate snapshots. To start and live-watch the tests, run:

```bash
pnpm dev:test
```

It will update snapshot images as well.

You can also use `pnpm test` to only run the test.

## Fidelity Benchmark

`test/fidelity` compares Satori with Chrome on sections of real websites. Each case in `test/fidelity/cases.ts` is a snapshot of a section: its static DOM tree, with its ancestors and the CSS rules that apply to it, and a screenshot of the snapshot in Chrome. To render the snapshots with Satori and compare them with Chrome, run:

```bash
pnpm build
pnpm fidelity
```

It prints the share of pixels that differ from Chrome, overall and of the content. The SVG and images of Satori, the differences and all of them side by side are written to `test/fidelity/output`. Run `pnpm fidelity --update` before a change to save the scores there, and `pnpm fidelity` then shows how the change affects them. The scores and images aren't committed, so that changes don't conflict with each other: add the scores before and after a change to its pull request instead.

To add a case or capture the sections again, which requires Chrome, run `pnpm fidelity:capture [names...]`. Fonts are mapped to static font files in the repository, which Chrome and Satori both use. Run `pnpm fidelity:capture --reference` to only render the screenshots again, for example after updating Chrome.
