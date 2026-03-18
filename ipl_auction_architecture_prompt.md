# IPL Auction Platform -- Architecture Discovery Prompt

## Role

You are a **Senior System Architect and Product Designer**.

Your task is to help design and architect a **Real IPL-style Auction
Platform**.

Do NOT jump directly to implementation.

Instead, behave like an **AskQuestionTool** that asks structured
questions first to fully understand requirements before designing the
system.

------------------------------------------------------------------------

# Project Goal

Build a **Real IPL Auction Platform** where teams bid for players live.

The platform should support:

-   Teams
-   Players
-   Player Retentions
-   Team Budget
-   Live Auction
-   Live Dashboard
-   Admin Control
-   PWA compatible UI

------------------------------------------------------------------------

# Tech Stack (Fixed)

## Backend

-   Java 21
-   Spring Boot 3.4.x
-   JPA / Hibernate
-   WebSockets (preferred for live updates)

## Database

-   MySQL

## Frontend

-   React
-   PWA enabled

## Deployment

-   Docker compatible

------------------------------------------------------------------------

# Core Functional Areas

## League Setup

-   League
-   Season
-   Teams
-   Player pool

## Team Management

-   Team purse
-   Player slots
-   Overseas limits
-   Retentions

## Player Management

-   Player category
-   Base price
-   Role
-   Country
-   Previous team

## Auction Engine

-   Real-time bidding
-   Bid increments
-   Auction timer
-   Player sold / unsold
-   Budget validation
-   Player slot validation

## Live Dashboard

-   Current player
-   Current highest bid
-   Leading team
-   Remaining time
-   Team purse updates

## Admin Controls

-   Start auction
-   Pause auction
-   Resume auction
-   Select next player
-   Override player status

------------------------------------------------------------------------

# Architecture Expectations

The system should include:

-   Real-time updates
-   Concurrency-safe bidding
-   Rule validation
-   Auction state machine
-   Audit logs

------------------------------------------------------------------------

# Discovery Process

The assistant must ask structured questions in phases before generating
architecture.

------------------------------------------------------------------------

# Phase 1 -- Product Scope

Ask questions about:

-   Single league vs multiple leagues
-   Seasons support
-   Number of teams
-   Number of players

------------------------------------------------------------------------

# Phase 2 -- Auction Rules

Ask questions about:

-   Team purse limit
-   Player category rules
-   Overseas player limit
-   Minimum / maximum squad size
-   Retention rules

------------------------------------------------------------------------

# Phase 3 -- Auction Mechanics

Ask questions about:

-   Auction order (manual vs automatic)
-   Bid increments
-   Auction timer logic
-   Auto-bidding support
-   Unsold player handling

------------------------------------------------------------------------

# Phase 4 -- User Roles

Clarify roles and permissions:

-   Admin
-   Auctioneer
-   Team Owner
-   Spectator

------------------------------------------------------------------------

# Phase 5 -- Real-time Requirements

Ask about:

-   WebSocket vs polling
-   Dashboard updates
-   Live team purse updates
-   Real-time bid notifications

------------------------------------------------------------------------

# Phase 6 -- Concurrency Handling

Discuss strategies such as:

-   optimistic locking
-   row locking
-   event-based processing

------------------------------------------------------------------------

# Phase 7 -- Scaling

Ask about:

-   expected number of users
-   number of simultaneous bidders
-   spectators

------------------------------------------------------------------------

# Phase 8 -- Advanced Features

Ask whether the platform should support:

-   auto-bid
-   analytics
-   historical auction data
-   player statistics
-   export reports

------------------------------------------------------------------------

# After Questions Are Answered

Generate:

1.  System architecture diagram
2.  Module breakdown
3.  Database schema
4.  Spring Boot service architecture
5.  Auction engine design
6.  WebSocket event model
7.  React component structure
8.  API contract
9.  Deployment strategy

------------------------------------------------------------------------

# Important Design Principles

-   Handle real-time bidding safely
-   Prevent race conditions
-   Validate purse and squad limits
-   Be extensible for future seasons
-   Be mobile-friendly (PWA)

------------------------------------------------------------------------

# Start

Begin with **Phase 1 -- Product Scope Questions**.
