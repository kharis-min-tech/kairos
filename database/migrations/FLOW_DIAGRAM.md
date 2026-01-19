# Schema Migration Flow

## Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                    KAIROS DATABASE SCHEMA                        │
│                    INITIALIZATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

                            START
                              │
                              ▼
                    ┌─────────────────────┐
                    │  01_functions.sql   │
                    │                     │
                    │  • Creates utility  │
                    │    function:        │
                    │    - update_        │
                    │      updated_at_    │
                    │      column()       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  02_tables.sql      │
                    │                     │
                    │  • Creates 28       │
                    │    tables with      │
                    │    primary keys     │
                    │  • No constraints   │
                    │    yet              │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  03_constraints.sql │
                    │                     │
                    │  • Foreign keys     │
                    │  • Check            │
                    │    constraints      │
                    │  • Unique           │
                    │    constraints      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  04_indexes.sql     │
                    │                     │
                    │  • Standard indexes │
                    │  • Partial indexes  │
                    │  • Performance      │
                    │    optimization     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  05_triggers.sql    │
                    │                     │
                    │  • 23 update        │
                    │    triggers         │
                    │  • Automated        │
                    │    timestamp        │
                    │    tracking         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  06_comments.sql    │
                    │                     │
                    │  • Table            │
                    │    documentation    │
                    │  • Metadata         │
                    │    comments         │
                    └──────────┬──────────┘
                               │
                               ▼
                            END
                    ✓ Schema Ready


═══════════════════════════════════════════════════════════════════

                        DEPENDENCY GRAPH

         01_functions.sql (No dependencies)
                │
                ├──> 02_tables.sql (Depends on: 01)
                │           │
                │           ├──> 03_constraints.sql (Depends on: 02)
                │           │           │
                │           │           ├──> 04_indexes.sql (Depends on: 02, 03)
                │           │           │
                │           │           └──> (parallel execution possible)
                │           │
                │           └──> 05_triggers.sql (Depends on: 01, 02)
                │                       │
                │                       └──> (can run parallel with 04)
                │
                └──> 06_comments.sql (Depends on: 02)
                            │
                            └──> (can run anytime after 02)

═══════════════════════════════════════════════════════════════════

                    ROLLBACK SEQUENCE

                If you need to undo changes, reverse the order:

                    06_comments.sql    → DROP COMMENTs
                    05_triggers.sql    → DROP TRIGGERs
                    04_indexes.sql     → DROP INDEXes
                    03_constraints.sql → DROP CONSTRAINTs
                    02_tables.sql      → DROP TABLEs
                    01_functions.sql   → DROP FUNCTIONs

                Or simply: dropdb kairos && createdb kairos

═══════════════════════════════════════════════════════════════════

                        OBJECTS CREATED

    ┌──────────────────┬─────────────────────────────────┐
    │ Category         │ Count                           │
    ├──────────────────┼─────────────────────────────────┤
    │ Functions        │ 1 utility function              │
    │ Tables           │ 28 core tables                  │
    │ Foreign Keys     │ 70+ relationships               │
    │ Check            │ 50+ data validation rules       │
    │ Unique           │ 30+ uniqueness constraints      │
    │ Standard Indexes │ 90+ performance indexes         │
    │ Partial Indexes  │ 6 conditional unique indexes    │
    │ Triggers         │ 23 automated timestamp updates  │
    │ Comments         │ 29 table documentation          │
    └──────────────────┴─────────────────────────────────┘

═══════════════════════════════════════════════════════════════════

                    AUTOMATED EXECUTION

    Use the provided shell script for automated execution:

        ./init_schema.sh [database_name]

    The script will:
    ✓ Verify PostgreSQL connection
    ✓ Check for required script files
    ✓ Create or recreate database
    ✓ Execute scripts in correct order
    ✓ Verify installation
    ✓ Report any errors

═══════════════════════════════════════════════════════════════════
