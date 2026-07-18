# Microeconomics Market Simulation

A simple microeconomics simulation that visualizes how buyers and sellers interact in a marketplace. The project models market transactions where buyers attempt to purchase goods within their budget, while sellers adjust their pricing strategies based on market demand and transaction outcomes.


#### [DEMO LINK](https://microeconomics-market-simulation.vercel.app/)

## Overview

This project was created as a practical way to explore and visualize core microeconomic concepts. Instead of learning solely through graphs and theory, users can observe how economic decisions affect market behavior in a simulated environment.

In the simulation:

* Buyers enter the market with a limited budget.
* Sellers offer products at a chosen price.
* Buyers may bargain with sellers to reach an acceptable deal.
* Sellers can analyze failed transactions and decide whether lowering prices could increase sales.
* Successful and unsuccessful transactions influence future market behavior.

## Why Visualization Matters

Microeconomics concepts can sometimes be difficult to understand through equations and charts alone. Visualization helps learners see economic principles in action by:

* Making abstract concepts easier to understand.
* Demonstrating the relationship between supply, demand, and pricing.
* Showing how individual decisions affect the overall market.
* Providing an interactive learning experience that encourages experimentation.

> By observing transactions in real time, learners can better understand how markets naturally adjust and respond to changing conditions.

## Market Disruptors

There are also a few things you can switch on to mess with the market and watch what happens:

* **Tax Increase** — the seller pays a bit more on each sale, so they bump up their price. Some buyers can't afford it anymore, and deals drop.

* **Subsidy** — the government chips in money on each sale, so the seller's cost goes down. They can charge less and still be okay, and more deals happen.

* **Price Ceiling** — a rule that says the price can't go above a certain number. Buyers get a cheaper deal, but sellers may not want to sell as much, so there's less stuff around.

* **Price Floor** — a rule that says the price can't drop below a certain number. Sellers are kept from selling too cheap, but buyers might not want to pay that much, so deals drop.

* **Demand Shock** — a bunch of new buyers suddenly show up, so demand jumps and more dealing happens.

> These disruptions allow us to observe how policies and external factors can influence market efficiency and participant behavior.

## What You Can Learn

Beyond watching buyers and sellers trade, the simulation is built to teach the core *results* of microeconomics:

* **The Round Summary** — after each round you get the headline numbers plus the welfare story:
  * **Consumer Surplus** — how much buyers saved versus their budget.
  * **Producer Surplus** — how much sellers earned above their cost.
  * **Deal Rate** — the share of buyers who successfully bought something (how *many* traded, not how *well*).
  * **Allocative Efficiency** — the share of the *maximum possible* total surplus the market actually captured. 100% means every beneficial trade happened.
  * **Deadweight Loss** — the surplus that vanished because some good trades never happened (price controls, taxes, or missed deals).
* **The Equilibrium Chart** — a live supply-and-demand diagram. Turn on a disruptor and you'll see it drawn right on the chart:
  * A **price ceiling** or **floor** line, with the resulting **shortage** (red) or **surplus** (blue) shaded in.
  * A **tax wedge** (yellow) and a **subsidy wedge** (green) showing the gap between what buyers pay and what sellers receive.
* **Explainer Tooltips** — every metric in the summary has a "?" button. Tap it for a definition and a worked example built from *that round's own numbers*, so the idea clicks using your own data.

## Installation

```bash
git clone https://github.com/melquidez/microeconomics-market-simulation.git
cd <project-folder>
```

Install all required dependencies:

```bash
npm install
```

Run the project:

```bash
npm run dev
```

## Features

* Buyer and seller market interactions
* Budget-aware purchasing decisions
* Price negotiation (bargaining)
* Adaptive seller pricing behavior
* Market disruption simulations
* Round Summary with welfare metrics (consumer/producer surplus, allocative efficiency, deadweight loss)
* Live equilibrium chart with price-control and tax/subsidy overlays
* In-app explainer tooltips for every summary metric
* Educational visualization of economic concepts

## TODO

* [x] Add bargain percentage control
* [ ] Add multiple currency options

## Notes

I studied Microeconomics, and this project reflects my understanding of the concepts based on what I have learned so far. The goal is educational rather than perfectly modeling real-world economies.

Collaborators are welcome to contribute, improve the simulation, and help spread economic learning through visualization and interactive experimentation.


> **Note:** Fixed an issue where early commits were accidentally attributed to my computer's local username instead of my GitHub account. 🥺🥺🥺
