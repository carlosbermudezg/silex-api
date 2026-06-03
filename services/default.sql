--
-- PostgreSQL database dump
--

\restrict D24xfRGyaOag54LelwjAZYKCq6103cdIw4c0rQLcsBXXlBE8fdcqg7SQuJWQ2lZ

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2026-05-26 02:15:10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 7 (class 2615 OID 41133)
-- Name: tenant_001; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA tenant_001;


ALTER SCHEMA tenant_001 OWNER TO postgres;

--
-- TOC entry 946 (class 1247 OID 41135)
-- Name: enum_Clientes_estado; Type: TYPE; Schema: tenant_001; Owner: postgres
--

CREATE TYPE tenant_001."enum_Clientes_estado" AS ENUM (
    'activo',
    'archivado'
);


ALTER TYPE tenant_001."enum_Clientes_estado" OWNER TO postgres;

--
-- TOC entry 949 (class 1247 OID 41140)
-- Name: enum_Creditos_estado; Type: TYPE; Schema: tenant_001; Owner: postgres
--

CREATE TYPE tenant_001."enum_Creditos_estado" AS ENUM (
    'pagado',
    'impago'
);


ALTER TYPE tenant_001."enum_Creditos_estado" OWNER TO postgres;

--
-- TOC entry 952 (class 1247 OID 41146)
-- Name: enum_Productos_tipo; Type: TYPE; Schema: tenant_001; Owner: postgres
--

CREATE TYPE tenant_001."enum_Productos_tipo" AS ENUM (
    'fisico',
    'digital'
);


ALTER TYPE tenant_001."enum_Productos_tipo" OWNER TO postgres;

--
-- TOC entry 955 (class 1247 OID 41152)
-- Name: enum_Usuarios_tipo; Type: TYPE; Schema: tenant_001; Owner: postgres
--

CREATE TYPE tenant_001."enum_Usuarios_tipo" AS ENUM (
    'administrador',
    'administrador_oficina',
    'cobrador'
);


ALTER TYPE tenant_001."enum_Usuarios_tipo" OWNER TO postgres;

--
-- TOC entry 958 (class 1247 OID 41160)
-- Name: frecuencia_pago_enum; Type: TYPE; Schema: tenant_001; Owner: postgres
--

CREATE TYPE tenant_001.frecuencia_pago_enum AS ENUM (
    'diario',
    'semanal',
    'quincenal',
    'mensual'
);


ALTER TYPE tenant_001.frecuencia_pago_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 41169)
-- Name: cajas; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.cajas (
    "saldoActual" numeric(12,2) DEFAULT '0'::double precision NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL,
    estado character varying(10) DEFAULT 'abierta'::character varying,
    "rutaId" integer NOT NULL,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.cajas OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 41178)
-- Name: cajas_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.cajas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.cajas_id_seq OWNER TO postgres;

--
-- TOC entry 5384 (class 0 OID 0)
-- Dependencies: 222
-- Name: cajas_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.cajas_id_seq OWNED BY tenant_001.cajas.id;


--
-- TOC entry 223 (class 1259 OID 41179)
-- Name: clientes; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.clientes (
    nombres character varying(255) NOT NULL,
    telefono character varying(255),
    direccion character varying(255),
    "coordenadasCasa" character varying(255),
    "coordenadasCobro" character varying(255),
    identificacion character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL,
    "rutaId" integer,
    nacionalidad character varying,
    "userId_create" integer,
    search_vector tsvector,
    estado character varying,
    buro double precision,
    updated boolean,
    codigo_cliente integer,
    "public_Id" uuid NOT NULL
);


ALTER TABLE tenant_001.clientes OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 41189)
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.clientes_id_seq OWNER TO postgres;

--
-- TOC entry 5385 (class 0 OID 0)
-- Dependencies: 224
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.clientes_id_seq OWNED BY tenant_001.clientes.id;


--
-- TOC entry 225 (class 1259 OID 41190)
-- Name: config_caja; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.config_caja (
    id integer NOT NULL,
    hora_cierre_caja time without time zone NOT NULL,
    hora_apertura_caja time without time zone,
    hora_gastos time without time zone
);


ALTER TABLE tenant_001.config_caja OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 41195)
-- Name: config_caja_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.config_caja_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.config_caja_id_seq OWNER TO postgres;

--
-- TOC entry 5386 (class 0 OID 0)
-- Dependencies: 226
-- Name: config_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.config_caja_id_seq OWNED BY tenant_001.config_caja.id;


--
-- TOC entry 227 (class 1259 OID 41196)
-- Name: config_credits; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.config_credits (
    "rutaId" integer NOT NULL,
    max_credits integer NOT NULL,
    interes double precision NOT NULL,
    plazo_maximo integer NOT NULL,
    plazo_minimo integer NOT NULL,
    monto_maximo double precision NOT NULL,
    monto_minimo double precision,
    frecuencia_pago tenant_001.frecuencia_pago_enum[],
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.config_credits OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 41207)
-- Name: config_default; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.config_default (
    id integer NOT NULL,
    monto_minimo numeric(10,2) NOT NULL,
    monto_maximo numeric(10,2) NOT NULL,
    plazo_minimo integer NOT NULL,
    plazo_maximo integer NOT NULL,
    interes numeric(5,2) NOT NULL,
    max_credits integer NOT NULL,
    frecuencia_pago text[] NOT NULL,
    days_to_yellow integer,
    days_to_red integer,
    porcentaje_abono_maximo numeric(5,2),
    porcentaje_minimo_novacion numeric(5,2),
    routes_limit integer DEFAULT 1
);


ALTER TABLE tenant_001.config_default OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 41221)
-- Name: config_default_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.config_default_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.config_default_id_seq OWNER TO postgres;

--
-- TOC entry 5387 (class 0 OID 0)
-- Dependencies: 229
-- Name: config_default_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.config_default_id_seq OWNED BY tenant_001.config_default.id;


--
-- TOC entry 230 (class 1259 OID 41222)
-- Name: config_dias_no_laborables; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.config_dias_no_laborables (
    id integer NOT NULL,
    excluir_sabados boolean DEFAULT false,
    excluir_domingos boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE tenant_001.config_dias_no_laborables OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 41229)
-- Name: config_dias_no_laborables_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.config_dias_no_laborables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.config_dias_no_laborables_id_seq OWNER TO postgres;

--
-- TOC entry 5388 (class 0 OID 0)
-- Dependencies: 231
-- Name: config_dias_no_laborables_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.config_dias_no_laborables_id_seq OWNED BY tenant_001.config_dias_no_laborables.id;


--
-- TOC entry 232 (class 1259 OID 41230)
-- Name: config_egresos_category; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.config_egresos_category (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    archivada boolean DEFAULT false,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.config_egresos_category OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 41238)
-- Name: config_egresos_category_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.config_egresos_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.config_egresos_category_id_seq OWNER TO postgres;

--
-- TOC entry 5389 (class 0 OID 0)
-- Dependencies: 233
-- Name: config_egresos_category_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.config_egresos_category_id_seq OWNED BY tenant_001.config_egresos_category.id;


--
-- TOC entry 234 (class 1259 OID 41239)
-- Name: config_ingresos_category; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.config_ingresos_category (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    archivada boolean DEFAULT false,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.config_ingresos_category OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 41247)
-- Name: config_ingresos_category_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.config_ingresos_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.config_ingresos_category_id_seq OWNER TO postgres;

--
-- TOC entry 5390 (class 0 OID 0)
-- Dependencies: 235
-- Name: config_ingresos_category_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.config_ingresos_category_id_seq OWNED BY tenant_001.config_ingresos_category.id;


--
-- TOC entry 236 (class 1259 OID 41248)
-- Name: creditos; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.creditos (
    monto numeric(12,2) NOT NULL,
    "fechaVencimiento" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL,
    "clienteId" integer,
    "usuarioId" integer,
    plazo integer,
    frecuencia_pago character varying,
    interes numeric(12,2),
    monto_interes_generado numeric(12,2),
    "productoId" integer,
    estado text,
    turno_id integer,
    user_null_id integer,
    saldo numeric(12,2) DEFAULT 0,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.creditos OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 41259)
-- Name: creditos_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.creditos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.creditos_id_seq OWNER TO postgres;

--
-- TOC entry 5391 (class 0 OID 0)
-- Dependencies: 237
-- Name: creditos_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.creditos_id_seq OWNED BY tenant_001.creditos.id;


--
-- TOC entry 238 (class 1259 OID 41260)
-- Name: cuotas; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.cuotas (
    monto numeric(12,2) NOT NULL,
    "fechaPago" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL,
    "creditoId" integer,
    estado character varying,
    monto_pagado numeric(12,2),
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.cuotas OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 41270)
-- Name: dias_no_laborables; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.dias_no_laborables (
    id integer NOT NULL,
    fecha date NOT NULL,
    descripcion text,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.dias_no_laborables OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 41279)
-- Name: dias_no_laborables_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.dias_no_laborables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.dias_no_laborables_id_seq OWNER TO postgres;

--
-- TOC entry 5392 (class 0 OID 0)
-- Dependencies: 240
-- Name: dias_no_laborables_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.dias_no_laborables_id_seq OWNED BY tenant_001.dias_no_laborables.id;


--
-- TOC entry 241 (class 1259 OID 41280)
-- Name: egresos; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.egresos (
    descripcion character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL,
    estado character varying,
    "cajaId" integer,
    "gastoCategoryId" integer,
    user_created_id integer,
    user_aproved_id integer,
    user_rejected_id integer,
    monto numeric(12,2),
    foto text,
    turno_id integer,
    observacion text,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.egresos OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 41288)
-- Name: egresos_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.egresos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.egresos_id_seq OWNER TO postgres;

--
-- TOC entry 5393 (class 0 OID 0)
-- Dependencies: 242
-- Name: egresos_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.egresos_id_seq OWNED BY tenant_001.egresos.id;


--
-- TOC entry 243 (class 1259 OID 41289)
-- Name: empresas; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.empresas (
    nombre character varying(255) NOT NULL,
    ruc character varying(255) NOT NULL,
    direccion character varying(255),
    telefono character varying(255),
    correo character varying(255),
    logo character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL
);


ALTER TABLE tenant_001.empresas OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 41299)
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.empresas_id_seq OWNER TO postgres;

--
-- TOC entry 5394 (class 0 OID 0)
-- Dependencies: 244
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.empresas_id_seq OWNED BY tenant_001.empresas.id;


--
-- TOC entry 245 (class 1259 OID 41300)
-- Name: fotoclientes; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.fotoclientes (
    foto text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL,
    "clienteId" integer,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.fotoclientes OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 41309)
-- Name: fotoclientes_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.fotoclientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.fotoclientes_id_seq OWNER TO postgres;

--
-- TOC entry 5395 (class 0 OID 0)
-- Dependencies: 246
-- Name: fotoclientes_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.fotoclientes_id_seq OWNED BY tenant_001.fotoclientes.id;


--
-- TOC entry 247 (class 1259 OID 41310)
-- Name: ingresos; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.ingresos (
    monto numeric(12,2) NOT NULL,
    descripcion character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL,
    estado character varying,
    user_aproved_id integer,
    user_created_id integer,
    user_rejected_id integer,
    "ingresoCategoryId" integer,
    foto text,
    "cajaId" integer,
    turno_id integer,
    observacion text,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.ingresos OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 41319)
-- Name: ingresos_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.ingresos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.ingresos_id_seq OWNER TO postgres;

--
-- TOC entry 5396 (class 0 OID 0)
-- Dependencies: 248
-- Name: ingresos_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.ingresos_id_seq OWNED BY tenant_001.ingresos.id;


--
-- TOC entry 249 (class 1259 OID 41320)
-- Name: movimientos_caja; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.movimientos_caja (
    id integer NOT NULL,
    "cajaId" integer NOT NULL,
    descripcion text NOT NULL,
    saldo numeric(15,2) NOT NULL,
    saldo_anterior numeric(15,2) NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    monto numeric(15,2),
    tipo character varying,
    "usuarioId" integer,
    category character varying,
    "clienteId" integer,
    "creditoId" integer,
    "turnoId" integer,
    "ingresoId" integer,
    "egresoId" integer,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.movimientos_caja OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 41332)
-- Name: movimientos_caja_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.movimientos_caja_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.movimientos_caja_id_seq OWNER TO postgres;

--
-- TOC entry 5397 (class 0 OID 0)
-- Dependencies: 250
-- Name: movimientos_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.movimientos_caja_id_seq OWNED BY tenant_001.movimientos_caja.id;


--
-- TOC entry 251 (class 1259 OID 41333)
-- Name: oficinas; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.oficinas (
    nombre character varying(255) NOT NULL,
    direccion character varying(255),
    telefono character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.oficinas OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 41342)
-- Name: oficinas_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.oficinas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.oficinas_id_seq OWNER TO postgres;

--
-- TOC entry 5398 (class 0 OID 0)
-- Dependencies: 252
-- Name: oficinas_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.oficinas_id_seq OWNED BY tenant_001.oficinas.id;


--
-- TOC entry 253 (class 1259 OID 41343)
-- Name: pagos; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.pagos (
    id integer NOT NULL,
    monto numeric(10,2) NOT NULL,
    user_created_id integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "metodoPago" character varying,
    cordenadas character varying,
    estado character varying,
    turno_id integer,
    user_null_id integer,
    observacion text,
    cliente_id integer,
    tipo character varying,
    saldo numeric(10,2) DEFAULT 0,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.pagos OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 41354)
-- Name: pagos_cuotas; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.pagos_cuotas (
    id integer NOT NULL,
    "pagoId" integer NOT NULL,
    "cuotaId" integer NOT NULL,
    monto_abonado numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    capital_pagado numeric(12,2),
    interes_pagado numeric(12,2)
);


ALTER TABLE tenant_001.pagos_cuotas OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 41362)
-- Name: pagos_cuotas_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.pagos_cuotas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.pagos_cuotas_id_seq OWNER TO postgres;

--
-- TOC entry 5399 (class 0 OID 0)
-- Dependencies: 255
-- Name: pagos_cuotas_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.pagos_cuotas_id_seq OWNED BY tenant_001.pagos_cuotas.id;


--
-- TOC entry 256 (class 1259 OID 41363)
-- Name: pagos_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.pagos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.pagos_id_seq OWNER TO postgres;

--
-- TOC entry 5400 (class 0 OID 0)
-- Dependencies: 256
-- Name: pagos_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.pagos_id_seq OWNED BY tenant_001.cuotas.id;


--
-- TOC entry 257 (class 1259 OID 41364)
-- Name: pagos_id_seq1; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.pagos_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.pagos_id_seq1 OWNER TO postgres;

--
-- TOC entry 5401 (class 0 OID 0)
-- Dependencies: 257
-- Name: pagos_id_seq1; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.pagos_id_seq1 OWNED BY tenant_001.pagos.id;


--
-- TOC entry 258 (class 1259 OID 41365)
-- Name: permisos; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.permisos (
    nombre character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL,
    descripcion text[],
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.permisos OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 41374)
-- Name: permisos_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.permisos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.permisos_id_seq OWNER TO postgres;

--
-- TOC entry 5402 (class 0 OID 0)
-- Dependencies: 259
-- Name: permisos_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.permisos_id_seq OWNED BY tenant_001.permisos.id;


--
-- TOC entry 260 (class 1259 OID 41385)
-- Name: ruta; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.ruta (
    nombre character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL,
    "oficinaId" integer,
    user_create integer,
    "userId" integer,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.ruta OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 41394)
-- Name: ruta_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.ruta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.ruta_id_seq OWNER TO postgres;

--
-- TOC entry 5403 (class 0 OID 0)
-- Dependencies: 261
-- Name: ruta_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.ruta_id_seq OWNED BY tenant_001.ruta.id;


--
-- TOC entry 262 (class 1259 OID 41400)
-- Name: traslado_clientes; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.traslado_clientes (
    id integer NOT NULL,
    oficina_origen_id integer NOT NULL,
    ruta_origen_id integer NOT NULL,
    cliente_id integer NOT NULL,
    oficina_destino_id integer NOT NULL,
    ruta_destino_id integer NOT NULL,
    motivo_traslado text NOT NULL,
    user_create integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.traslado_clientes OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 41415)
-- Name: traslado_clientes_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.traslado_clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.traslado_clientes_id_seq OWNER TO postgres;

--
-- TOC entry 5404 (class 0 OID 0)
-- Dependencies: 263
-- Name: traslado_clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.traslado_clientes_id_seq OWNED BY tenant_001.traslado_clientes.id;


--
-- TOC entry 264 (class 1259 OID 41416)
-- Name: traslado_efectivo; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.traslado_efectivo (
    id integer NOT NULL,
    ruta_origen_id integer NOT NULL,
    ruta_destino_id integer NOT NULL,
    monto numeric(12,2) NOT NULL,
    motivo_traslado text NOT NULL,
    user_create integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.traslado_efectivo OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 41429)
-- Name: traslado_efectivo_rutas_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.traslado_efectivo_rutas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.traslado_efectivo_rutas_id_seq OWNER TO postgres;

--
-- TOC entry 5405 (class 0 OID 0)
-- Dependencies: 265
-- Name: traslado_efectivo_rutas_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.traslado_efectivo_rutas_id_seq OWNED BY tenant_001.traslado_efectivo.id;


--
-- TOC entry 266 (class 1259 OID 41430)
-- Name: traslado_rutas; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.traslado_rutas (
    id integer NOT NULL,
    ruta_id integer NOT NULL,
    oficina_origen_id integer NOT NULL,
    oficina_destino_id integer NOT NULL,
    motivo_traslado text NOT NULL,
    user_create integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.traslado_rutas OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 41443)
-- Name: traslado_rutas_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.traslado_rutas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.traslado_rutas_id_seq OWNER TO postgres;

--
-- TOC entry 5406 (class 0 OID 0)
-- Dependencies: 267
-- Name: traslado_rutas_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.traslado_rutas_id_seq OWNED BY tenant_001.traslado_rutas.id;


--
-- TOC entry 268 (class 1259 OID 41444)
-- Name: turnos; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.turnos (
    id integer NOT NULL,
    caja_id integer,
    usuario_open integer,
    fecha_apertura timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_cierre timestamp without time zone,
    monto_inicial numeric(15,2) NOT NULL,
    monto_final numeric(15,2),
    observaciones_apertura text,
    observaciones_cierre text,
    usuario_close integer,
    sistema boolean,
    cantidad_creditos integer,
    cantidad_cobro numeric(10,2)
);


ALTER TABLE tenant_001.turnos OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 41453)
-- Name: turnos_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.turnos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.turnos_id_seq OWNER TO postgres;

--
-- TOC entry 5407 (class 0 OID 0)
-- Dependencies: 269
-- Name: turnos_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.turnos_id_seq OWNED BY tenant_001.turnos.id;


--
-- TOC entry 270 (class 1259 OID 41454)
-- Name: usuariooficinas; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.usuariooficinas (
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "oficinaId" integer,
    "usuarioId" integer
);


ALTER TABLE tenant_001.usuariooficinas OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 41466)
-- Name: usuariorutas; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.usuariorutas (
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "rutaId" integer,
    "usuarioId" integer
);


ALTER TABLE tenant_001.usuariorutas OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 41471)
-- Name: usuarios; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.usuarios (
    nombre character varying(255) NOT NULL,
    correo character varying(255) NOT NULL,
    contrasena character varying(255) NOT NULL,
    tipo tenant_001."enum_Usuarios_tipo" NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    id integer NOT NULL,
    "permisoId" integer,
    estado text,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.usuarios OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 41483)
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.usuarios_id_seq OWNER TO postgres;

--
-- TOC entry 5408 (class 0 OID 0)
-- Dependencies: 273
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.usuarios_id_seq OWNED BY tenant_001.usuarios.id;


--
-- TOC entry 274 (class 1259 OID 41484)
-- Name: vehiculos; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.vehiculos (
    id integer NOT NULL,
    placa text NOT NULL,
    "userId" integer NOT NULL,
    chasis text,
    public_id uuid NOT NULL
);


ALTER TABLE tenant_001.vehiculos OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 41492)
-- Name: vehiculos_fotos; Type: TABLE; Schema: tenant_001; Owner: postgres
--

CREATE TABLE tenant_001.vehiculos_fotos (
    "vehiculoId" integer NOT NULL,
    foto text NOT NULL
);


ALTER TABLE tenant_001.vehiculos_fotos OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 41499)
-- Name: vehiculos_id_seq; Type: SEQUENCE; Schema: tenant_001; Owner: postgres
--

CREATE SEQUENCE tenant_001.vehiculos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tenant_001.vehiculos_id_seq OWNER TO postgres;

--
-- TOC entry 5409 (class 0 OID 0)
-- Dependencies: 276
-- Name: vehiculos_id_seq; Type: SEQUENCE OWNED BY; Schema: tenant_001; Owner: postgres
--

ALTER SEQUENCE tenant_001.vehiculos_id_seq OWNED BY tenant_001.vehiculos.id;


--
-- TOC entry 5052 (class 2604 OID 41500)
-- Name: cajas id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.cajas ALTER COLUMN id SET DEFAULT nextval('tenant_001.cajas_id_seq'::regclass);


--
-- TOC entry 5054 (class 2604 OID 41501)
-- Name: clientes id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.clientes ALTER COLUMN id SET DEFAULT nextval('tenant_001.clientes_id_seq'::regclass);


--
-- TOC entry 5055 (class 2604 OID 41502)
-- Name: config_caja id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.config_caja ALTER COLUMN id SET DEFAULT nextval('tenant_001.config_caja_id_seq'::regclass);


--
-- TOC entry 5056 (class 2604 OID 41503)
-- Name: config_default id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.config_default ALTER COLUMN id SET DEFAULT nextval('tenant_001.config_default_id_seq'::regclass);


--
-- TOC entry 5058 (class 2604 OID 41504)
-- Name: config_dias_no_laborables id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.config_dias_no_laborables ALTER COLUMN id SET DEFAULT nextval('tenant_001.config_dias_no_laborables_id_seq'::regclass);


--
-- TOC entry 5062 (class 2604 OID 41505)
-- Name: config_egresos_category id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.config_egresos_category ALTER COLUMN id SET DEFAULT nextval('tenant_001.config_egresos_category_id_seq'::regclass);


--
-- TOC entry 5066 (class 2604 OID 41506)
-- Name: config_ingresos_category id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.config_ingresos_category ALTER COLUMN id SET DEFAULT nextval('tenant_001.config_ingresos_category_id_seq'::regclass);


--
-- TOC entry 5070 (class 2604 OID 41507)
-- Name: creditos id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.creditos ALTER COLUMN id SET DEFAULT nextval('tenant_001.creditos_id_seq'::regclass);


--
-- TOC entry 5072 (class 2604 OID 41508)
-- Name: cuotas id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.cuotas ALTER COLUMN id SET DEFAULT nextval('tenant_001.pagos_id_seq'::regclass);


--
-- TOC entry 5073 (class 2604 OID 41509)
-- Name: dias_no_laborables id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.dias_no_laborables ALTER COLUMN id SET DEFAULT nextval('tenant_001.dias_no_laborables_id_seq'::regclass);


--
-- TOC entry 5076 (class 2604 OID 41510)
-- Name: egresos id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.egresos ALTER COLUMN id SET DEFAULT nextval('tenant_001.egresos_id_seq'::regclass);


--
-- TOC entry 5077 (class 2604 OID 41511)
-- Name: empresas id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.empresas ALTER COLUMN id SET DEFAULT nextval('tenant_001.empresas_id_seq'::regclass);


--
-- TOC entry 5078 (class 2604 OID 41512)
-- Name: fotoclientes id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.fotoclientes ALTER COLUMN id SET DEFAULT nextval('tenant_001.fotoclientes_id_seq'::regclass);


--
-- TOC entry 5079 (class 2604 OID 41513)
-- Name: ingresos id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.ingresos ALTER COLUMN id SET DEFAULT nextval('tenant_001.ingresos_id_seq'::regclass);


--
-- TOC entry 5080 (class 2604 OID 41514)
-- Name: movimientos_caja id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.movimientos_caja ALTER COLUMN id SET DEFAULT nextval('tenant_001.movimientos_caja_id_seq'::regclass);


--
-- TOC entry 5083 (class 2604 OID 41515)
-- Name: oficinas id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.oficinas ALTER COLUMN id SET DEFAULT nextval('tenant_001.oficinas_id_seq'::regclass);


--
-- TOC entry 5084 (class 2604 OID 41516)
-- Name: pagos id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.pagos ALTER COLUMN id SET DEFAULT nextval('tenant_001.pagos_id_seq1'::regclass);


--
-- TOC entry 5088 (class 2604 OID 41517)
-- Name: pagos_cuotas id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.pagos_cuotas ALTER COLUMN id SET DEFAULT nextval('tenant_001.pagos_cuotas_id_seq'::regclass);


--
-- TOC entry 5090 (class 2604 OID 41518)
-- Name: permisos id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.permisos ALTER COLUMN id SET DEFAULT nextval('tenant_001.permisos_id_seq'::regclass);


--
-- TOC entry 5091 (class 2604 OID 41520)
-- Name: ruta id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.ruta ALTER COLUMN id SET DEFAULT nextval('tenant_001.ruta_id_seq'::regclass);


--
-- TOC entry 5092 (class 2604 OID 41521)
-- Name: traslado_clientes id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.traslado_clientes ALTER COLUMN id SET DEFAULT nextval('tenant_001.traslado_clientes_id_seq'::regclass);


--
-- TOC entry 5095 (class 2604 OID 41522)
-- Name: traslado_efectivo id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.traslado_efectivo ALTER COLUMN id SET DEFAULT nextval('tenant_001.traslado_efectivo_rutas_id_seq'::regclass);


--
-- TOC entry 5098 (class 2604 OID 41523)
-- Name: traslado_rutas id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.traslado_rutas ALTER COLUMN id SET DEFAULT nextval('tenant_001.traslado_rutas_id_seq'::regclass);


--
-- TOC entry 5101 (class 2604 OID 41524)
-- Name: turnos id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.turnos ALTER COLUMN id SET DEFAULT nextval('tenant_001.turnos_id_seq'::regclass);


--
-- TOC entry 5103 (class 2604 OID 41525)
-- Name: usuarios id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.usuarios ALTER COLUMN id SET DEFAULT nextval('tenant_001.usuarios_id_seq'::regclass);


--
-- TOC entry 5104 (class 2604 OID 41526)
-- Name: vehiculos id; Type: DEFAULT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.vehiculos ALTER COLUMN id SET DEFAULT nextval('tenant_001.vehiculos_id_seq'::regclass);


--
-- TOC entry 5323 (class 0 OID 41169)
-- Dependencies: 221
-- Data for Name: cajas; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.cajas ("saldoActual", "createdAt", "updatedAt", id, estado, "rutaId", public_id) FROM stdin;
\.


--
-- TOC entry 5325 (class 0 OID 41179)
-- Dependencies: 223
-- Data for Name: clientes; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.clientes (nombres, telefono, direccion, "coordenadasCasa", "coordenadasCobro", identificacion, "createdAt", "updatedAt", id, "rutaId", nacionalidad, "userId_create", search_vector, estado, buro, updated, codigo_cliente, "public_Id") FROM stdin;
\.


--
-- TOC entry 5327 (class 0 OID 41190)
-- Dependencies: 225
-- Data for Name: config_caja; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.config_caja (id, hora_cierre_caja, hora_apertura_caja, hora_gastos) FROM stdin;
1	20:00:00	08:00:00	18:00:00
\.


--
-- TOC entry 5329 (class 0 OID 41196)
-- Dependencies: 227
-- Data for Name: config_credits; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.config_credits ("rutaId", max_credits, interes, plazo_maximo, plazo_minimo, monto_maximo, monto_minimo, frecuencia_pago, public_id) FROM stdin;
\.


--
-- TOC entry 5330 (class 0 OID 41207)
-- Dependencies: 228
-- Data for Name: config_default; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.config_default (id, monto_minimo, monto_maximo, plazo_minimo, plazo_maximo, interes, max_credits, frecuencia_pago, days_to_yellow, days_to_red, porcentaje_abono_maximo, porcentaje_minimo_novacion, routes_limit) FROM stdin;
1	10.00	1000.00	1	30	10.00	1	{diario,semanal,quincenal,mensual}	1	3	100.00	50.00	1
\.


--
-- TOC entry 5332 (class 0 OID 41222)
-- Dependencies: 230
-- Data for Name: config_dias_no_laborables; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.config_dias_no_laborables (id, excluir_sabados, excluir_domingos, updated_at) FROM stdin;
1	f	t	2026-05-21 10:17:10.318157
\.


--
-- TOC entry 5334 (class 0 OID 41230)
-- Dependencies: 232
-- Data for Name: config_egresos_category; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.config_egresos_category (id, nombre, "createdAt", "updatedAt", archivada, public_id) FROM stdin;
\.


--
-- TOC entry 5336 (class 0 OID 41239)
-- Dependencies: 234
-- Data for Name: config_ingresos_category; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.config_ingresos_category (id, nombre, "createdAt", "updatedAt", archivada, public_id) FROM stdin;
\.


--
-- TOC entry 5338 (class 0 OID 41248)
-- Dependencies: 236
-- Data for Name: creditos; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.creditos (monto, "fechaVencimiento", "createdAt", "updatedAt", id, "clienteId", "usuarioId", plazo, frecuencia_pago, interes, monto_interes_generado, "productoId", estado, turno_id, user_null_id, saldo, public_id) FROM stdin;
\.


--
-- TOC entry 5340 (class 0 OID 41260)
-- Dependencies: 238
-- Data for Name: cuotas; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.cuotas (monto, "fechaPago", "createdAt", "updatedAt", id, "creditoId", estado, monto_pagado, public_id) FROM stdin;
\.


--
-- TOC entry 5341 (class 0 OID 41270)
-- Dependencies: 239
-- Data for Name: dias_no_laborables; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.dias_no_laborables (id, fecha, descripcion, "createdAt", "updatedAt", public_id) FROM stdin;
\.


--
-- TOC entry 5343 (class 0 OID 41280)
-- Dependencies: 241
-- Data for Name: egresos; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.egresos (descripcion, "createdAt", "updatedAt", id, estado, "cajaId", "gastoCategoryId", user_created_id, user_aproved_id, user_rejected_id, monto, foto, turno_id, observacion, public_id) FROM stdin;
\.


--
-- TOC entry 5345 (class 0 OID 41289)
-- Dependencies: 243
-- Data for Name: empresas; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.empresas (nombre, ruc, direccion, telefono, correo, logo, "createdAt", "updatedAt", id) FROM stdin;
\.


--
-- TOC entry 5347 (class 0 OID 41300)
-- Dependencies: 245
-- Data for Name: fotoclientes; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.fotoclientes (foto, "createdAt", "updatedAt", id, "clienteId", public_id) FROM stdin;
\.


--
-- TOC entry 5349 (class 0 OID 41310)
-- Dependencies: 247
-- Data for Name: ingresos; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.ingresos (monto, descripcion, "createdAt", "updatedAt", id, estado, user_aproved_id, user_created_id, user_rejected_id, "ingresoCategoryId", foto, "cajaId", turno_id, observacion, public_id) FROM stdin;
\.


--
-- TOC entry 5351 (class 0 OID 41320)
-- Dependencies: 249
-- Data for Name: movimientos_caja; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.movimientos_caja (id, "cajaId", descripcion, saldo, saldo_anterior, "createdAt", "updatedAt", monto, tipo, "usuarioId", category, "clienteId", "creditoId", "turnoId", "ingresoId", "egresoId", public_id) FROM stdin;
\.


--
-- TOC entry 5353 (class 0 OID 41333)
-- Dependencies: 251
-- Data for Name: oficinas; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.oficinas (nombre, direccion, telefono, "createdAt", "updatedAt", id, public_id) FROM stdin;
\.


--
-- TOC entry 5355 (class 0 OID 41343)
-- Dependencies: 253
-- Data for Name: pagos; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.pagos (id, monto, user_created_id, "createdAt", "updatedAt", "metodoPago", cordenadas, estado, turno_id, user_null_id, observacion, cliente_id, tipo, saldo, public_id) FROM stdin;
\.


--
-- TOC entry 5356 (class 0 OID 41354)
-- Dependencies: 254
-- Data for Name: pagos_cuotas; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.pagos_cuotas (id, "pagoId", "cuotaId", monto_abonado, created_at, capital_pagado, interes_pagado) FROM stdin;
\.


--
-- TOC entry 5360 (class 0 OID 41365)
-- Dependencies: 258
-- Data for Name: permisos; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.permisos (nombre, "createdAt", "updatedAt", id, descripcion, public_id) FROM stdin;
Super Administrador	2026-05-21 10:17:10.320472-05	2026-05-21 10:17:10.320472-05	1	{"[\\"addcl\\",\\"viewcl\\",\\"archcl\\",\\"editcl\\",\\"addpr\\",\\"viewpr\\",\\"archpr\\",\\"edirpr\\",\\"addpcr\\",\\"viewcr\\",\\"archcr\\",\\"edircr\\",\\"nullcr\\",\\"mknovcr\\",\\"addin\\",\\"addeg\\",\\"autorize\\",\\"viewcj\\",\\"bloqcj\\",\\"cerrarcj\\",\\"nullab\\",\\"viewStatusAccount\\",\\"viewCredits\\",\\"viewInEg\\",\\"viewUtility\\",\\"viewConfigCredits\\",\\"editConfigCredits\\",\\"viewRutaConfig\\",\\"editRutaConfig\\",\\"viewConfigCaja\\",\\"editConfigCaja\\",\\"viewLaboral\\",\\"addLaboral\\",\\"deleteLaboral\\",\\"viewConfigIn\\",\\"addConfigInCat\\",\\"editConfigInCat\\",\\"archConfigInCat\\",\\"viewConfigEg\\",\\"addConfigEgCat\\",\\"editConfigEgCat\\",\\"archConfigEgCat\\",\\"viewConfigBuro\\",\\"editConfigBuro\\",\\"viewEmpresaData\\",\\"editEmpresaData\\",\\"addof\\",\\"viewof\\",\\"editof\\",\\"delof\\",\\"addrut\\",\\"viewrut\\",\\"editrut\\",\\"delrut\\",\\"viewRutaTr\\",\\"mkRutaTr\\",\\"viewClTr\\",\\"mkClTr\\",\\"viewMoneyTr\\",\\"mkMoneyTr\\",\\"viewVh\\",\\"addVh\\",\\"editVh\\",\\"delVh\\",\\"addperm\\",\\"editperm\\",\\"viewperm\\",\\"delperm\\",\\"addus\\",\\"viewus\\",\\"editus\\",\\"archus\\"]"}	90e42f7c-5ead-4c3b-ba24-8ea6f024e235
\.


--
-- TOC entry 5362 (class 0 OID 41385)
-- Dependencies: 260
-- Data for Name: ruta; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.ruta (nombre, "createdAt", "updatedAt", id, "oficinaId", user_create, "userId", public_id) FROM stdin;
\.


--
-- TOC entry 5364 (class 0 OID 41400)
-- Dependencies: 262
-- Data for Name: traslado_clientes; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.traslado_clientes (id, oficina_origen_id, ruta_origen_id, cliente_id, oficina_destino_id, ruta_destino_id, motivo_traslado, user_create, created_at, updated_at, public_id) FROM stdin;
\.


--
-- TOC entry 5366 (class 0 OID 41416)
-- Dependencies: 264
-- Data for Name: traslado_efectivo; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.traslado_efectivo (id, ruta_origen_id, ruta_destino_id, monto, motivo_traslado, user_create, created_at, updated_at, public_id) FROM stdin;
\.


--
-- TOC entry 5368 (class 0 OID 41430)
-- Dependencies: 266
-- Data for Name: traslado_rutas; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.traslado_rutas (id, ruta_id, oficina_origen_id, oficina_destino_id, motivo_traslado, user_create, created_at, updated_at, public_id) FROM stdin;
\.


--
-- TOC entry 5370 (class 0 OID 41444)
-- Dependencies: 268
-- Data for Name: turnos; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.turnos (id, caja_id, usuario_open, fecha_apertura, fecha_cierre, monto_inicial, monto_final, observaciones_apertura, observaciones_cierre, usuario_close, sistema, cantidad_creditos, cantidad_cobro) FROM stdin;
\.


--
-- TOC entry 5372 (class 0 OID 41454)
-- Dependencies: 270
-- Data for Name: usuariooficinas; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.usuariooficinas ("createdAt", "updatedAt", "oficinaId", "usuarioId") FROM stdin;
\.


--
-- TOC entry 5373 (class 0 OID 41466)
-- Dependencies: 271
-- Data for Name: usuariorutas; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.usuariorutas ("createdAt", "updatedAt", "rutaId", "usuarioId") FROM stdin;
\.


--
-- TOC entry 5374 (class 0 OID 41471)
-- Dependencies: 272
-- Data for Name: usuarios; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.usuarios (nombre, correo, contrasena, tipo, "createdAt", "updatedAt", id, "permisoId", estado, public_id) FROM stdin;
\.


--
-- TOC entry 5376 (class 0 OID 41484)
-- Dependencies: 274
-- Data for Name: vehiculos; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.vehiculos (id, placa, "userId", chasis, public_id) FROM stdin;
\.


--
-- TOC entry 5377 (class 0 OID 41492)
-- Dependencies: 275
-- Data for Name: vehiculos_fotos; Type: TABLE DATA; Schema: tenant_001; Owner: postgres
--

COPY tenant_001.vehiculos_fotos ("vehiculoId", foto) FROM stdin;
\.


--
-- TOC entry 5410 (class 0 OID 0)
-- Dependencies: 222
-- Name: cajas_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.cajas_id_seq', 1, true);


--
-- TOC entry 5411 (class 0 OID 0)
-- Dependencies: 224
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.clientes_id_seq', 1, false);


--
-- TOC entry 5412 (class 0 OID 0)
-- Dependencies: 226
-- Name: config_caja_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.config_caja_id_seq', 1, false);


--
-- TOC entry 5413 (class 0 OID 0)
-- Dependencies: 229
-- Name: config_default_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.config_default_id_seq', 1, false);


--
-- TOC entry 5414 (class 0 OID 0)
-- Dependencies: 231
-- Name: config_dias_no_laborables_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.config_dias_no_laborables_id_seq', 1, false);


--
-- TOC entry 5415 (class 0 OID 0)
-- Dependencies: 233
-- Name: config_egresos_category_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.config_egresos_category_id_seq', 1, true);


--
-- TOC entry 5416 (class 0 OID 0)
-- Dependencies: 235
-- Name: config_ingresos_category_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.config_ingresos_category_id_seq', 1, true);


--
-- TOC entry 5417 (class 0 OID 0)
-- Dependencies: 237
-- Name: creditos_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.creditos_id_seq', 1, false);


--
-- TOC entry 5418 (class 0 OID 0)
-- Dependencies: 240
-- Name: dias_no_laborables_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.dias_no_laborables_id_seq', 1, false);


--
-- TOC entry 5419 (class 0 OID 0)
-- Dependencies: 242
-- Name: egresos_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.egresos_id_seq', 1, true);


--
-- TOC entry 5420 (class 0 OID 0)
-- Dependencies: 244
-- Name: empresas_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.empresas_id_seq', 1, true);


--
-- TOC entry 5421 (class 0 OID 0)
-- Dependencies: 246
-- Name: fotoclientes_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.fotoclientes_id_seq', 1, false);


--
-- TOC entry 5422 (class 0 OID 0)
-- Dependencies: 248
-- Name: ingresos_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.ingresos_id_seq', 1, true);


--
-- TOC entry 5423 (class 0 OID 0)
-- Dependencies: 250
-- Name: movimientos_caja_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.movimientos_caja_id_seq', 2, true);


--
-- TOC entry 5424 (class 0 OID 0)
-- Dependencies: 252
-- Name: oficinas_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.oficinas_id_seq', 1, true);


--
-- TOC entry 5425 (class 0 OID 0)
-- Dependencies: 255
-- Name: pagos_cuotas_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.pagos_cuotas_id_seq', 1, false);


--
-- TOC entry 5426 (class 0 OID 0)
-- Dependencies: 256
-- Name: pagos_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.pagos_id_seq', 1, false);


--
-- TOC entry 5427 (class 0 OID 0)
-- Dependencies: 257
-- Name: pagos_id_seq1; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.pagos_id_seq1', 1, false);


--
-- TOC entry 5428 (class 0 OID 0)
-- Dependencies: 259
-- Name: permisos_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.permisos_id_seq', 2, true);


--
-- TOC entry 5429 (class 0 OID 0)
-- Dependencies: 261
-- Name: ruta_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.ruta_id_seq', 1, true);


--
-- TOC entry 5430 (class 0 OID 0)
-- Dependencies: 263
-- Name: traslado_clientes_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.traslado_clientes_id_seq', 1, false);


--
-- TOC entry 5431 (class 0 OID 0)
-- Dependencies: 265
-- Name: traslado_efectivo_rutas_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.traslado_efectivo_rutas_id_seq', 1, false);


--
-- TOC entry 5432 (class 0 OID 0)
-- Dependencies: 267
-- Name: traslado_rutas_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.traslado_rutas_id_seq', 1, false);


--
-- TOC entry 5433 (class 0 OID 0)
-- Dependencies: 269
-- Name: turnos_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.turnos_id_seq', 1, true);


--
-- TOC entry 5434 (class 0 OID 0)
-- Dependencies: 273
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.usuarios_id_seq', 2, true);


--
-- TOC entry 5435 (class 0 OID 0)
-- Dependencies: 276
-- Name: vehiculos_id_seq; Type: SEQUENCE SET; Schema: tenant_001; Owner: postgres
--

SELECT pg_catalog.setval('tenant_001.vehiculos_id_seq', 1, false);


--
-- TOC entry 5134 (class 2606 OID 41528)
-- Name: empresas Empresas_ruc_key; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.empresas
    ADD CONSTRAINT "Empresas_ruc_key" UNIQUE (ruc);


--
-- TOC entry 5150 (class 2606 OID 41530)
-- Name: permisos Permisos_nombre_key; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.permisos
    ADD CONSTRAINT "Permisos_nombre_key" UNIQUE (nombre);


--
-- TOC entry 5164 (class 2606 OID 41534)
-- Name: usuarios Usuarios_correo_key; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.usuarios
    ADD CONSTRAINT "Usuarios_correo_key" UNIQUE (correo);


--
-- TOC entry 5106 (class 2606 OID 41536)
-- Name: cajas cajas_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.cajas
    ADD CONSTRAINT cajas_pkey PRIMARY KEY (id);


--
-- TOC entry 5108 (class 2606 OID 41538)
-- Name: clientes clientes_codigo_cliente_unique; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.clientes
    ADD CONSTRAINT clientes_codigo_cliente_unique UNIQUE (codigo_cliente);


--
-- TOC entry 5110 (class 2606 OID 41540)
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- TOC entry 5112 (class 2606 OID 41542)
-- Name: config_caja config_caja_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.config_caja
    ADD CONSTRAINT config_caja_pkey PRIMARY KEY (id);


--
-- TOC entry 5114 (class 2606 OID 41544)
-- Name: config_credits config_credits_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.config_credits
    ADD CONSTRAINT config_credits_pkey PRIMARY KEY ("rutaId");


--
-- TOC entry 5116 (class 2606 OID 41546)
-- Name: config_default config_default_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.config_default
    ADD CONSTRAINT config_default_pkey PRIMARY KEY (id);


--
-- TOC entry 5118 (class 2606 OID 41548)
-- Name: config_dias_no_laborables config_dias_no_laborables_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.config_dias_no_laborables
    ADD CONSTRAINT config_dias_no_laborables_pkey PRIMARY KEY (id);


--
-- TOC entry 5120 (class 2606 OID 41550)
-- Name: config_egresos_category config_egresos_category_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.config_egresos_category
    ADD CONSTRAINT config_egresos_category_pkey PRIMARY KEY (id);


--
-- TOC entry 5122 (class 2606 OID 41552)
-- Name: config_ingresos_category config_ingresos_category_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.config_ingresos_category
    ADD CONSTRAINT config_ingresos_category_pkey PRIMARY KEY (id);


--
-- TOC entry 5124 (class 2606 OID 41554)
-- Name: creditos creditos_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.creditos
    ADD CONSTRAINT creditos_pkey PRIMARY KEY (id);


--
-- TOC entry 5128 (class 2606 OID 41556)
-- Name: dias_no_laborables dias_no_laborables_fecha_key; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.dias_no_laborables
    ADD CONSTRAINT dias_no_laborables_fecha_key UNIQUE (fecha);


--
-- TOC entry 5130 (class 2606 OID 41558)
-- Name: dias_no_laborables dias_no_laborables_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.dias_no_laborables
    ADD CONSTRAINT dias_no_laborables_pkey PRIMARY KEY (id);


--
-- TOC entry 5132 (class 2606 OID 41560)
-- Name: egresos egresos_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.egresos
    ADD CONSTRAINT egresos_pkey PRIMARY KEY (id);


--
-- TOC entry 5136 (class 2606 OID 41562)
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- TOC entry 5138 (class 2606 OID 41564)
-- Name: fotoclientes fotoclientes_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.fotoclientes
    ADD CONSTRAINT fotoclientes_pkey PRIMARY KEY (id);


--
-- TOC entry 5140 (class 2606 OID 41566)
-- Name: ingresos ingresos_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.ingresos
    ADD CONSTRAINT ingresos_pkey PRIMARY KEY (id);


--
-- TOC entry 5142 (class 2606 OID 41568)
-- Name: movimientos_caja movimientos_caja_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.movimientos_caja
    ADD CONSTRAINT movimientos_caja_pkey PRIMARY KEY (id);


--
-- TOC entry 5144 (class 2606 OID 41570)
-- Name: oficinas oficinas_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.oficinas
    ADD CONSTRAINT oficinas_pkey PRIMARY KEY (id);


--
-- TOC entry 5148 (class 2606 OID 41572)
-- Name: pagos_cuotas pagos_cuotas_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.pagos_cuotas
    ADD CONSTRAINT pagos_cuotas_pkey PRIMARY KEY (id);


--
-- TOC entry 5126 (class 2606 OID 41574)
-- Name: cuotas pagos_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.cuotas
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id);


--
-- TOC entry 5146 (class 2606 OID 41576)
-- Name: pagos pagos_pkey1; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.pagos
    ADD CONSTRAINT pagos_pkey1 PRIMARY KEY (id);


--
-- TOC entry 5152 (class 2606 OID 41578)
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id);


--
-- TOC entry 5154 (class 2606 OID 41582)
-- Name: ruta ruta_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.ruta
    ADD CONSTRAINT ruta_pkey PRIMARY KEY (id);


--
-- TOC entry 5156 (class 2606 OID 41584)
-- Name: traslado_clientes traslado_clientes_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.traslado_clientes
    ADD CONSTRAINT traslado_clientes_pkey PRIMARY KEY (id);


--
-- TOC entry 5158 (class 2606 OID 41586)
-- Name: traslado_efectivo traslado_efectivo_rutas_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.traslado_efectivo
    ADD CONSTRAINT traslado_efectivo_rutas_pkey PRIMARY KEY (id);


--
-- TOC entry 5160 (class 2606 OID 41588)
-- Name: traslado_rutas traslado_rutas_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.traslado_rutas
    ADD CONSTRAINT traslado_rutas_pkey PRIMARY KEY (id);


--
-- TOC entry 5162 (class 2606 OID 41590)
-- Name: turnos turnos_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.turnos
    ADD CONSTRAINT turnos_pkey PRIMARY KEY (id);


--
-- TOC entry 5166 (class 2606 OID 41592)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 5168 (class 2606 OID 41594)
-- Name: vehiculos vehiculos_pkey; Type: CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.vehiculos
    ADD CONSTRAINT vehiculos_pkey PRIMARY KEY (id);


--
-- TOC entry 5169 (class 2606 OID 41595)
-- Name: movimientos_caja fk_movimientos_usuario; Type: FK CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.movimientos_caja
    ADD CONSTRAINT fk_movimientos_usuario FOREIGN KEY ("usuarioId") REFERENCES tenant_001.usuarios(id);


--
-- TOC entry 5170 (class 2606 OID 41600)
-- Name: movimientos_caja movimientos_caja_cajaId_fkey; Type: FK CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.movimientos_caja
    ADD CONSTRAINT "movimientos_caja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES tenant_001.cajas(id) ON DELETE CASCADE;


--
-- TOC entry 5172 (class 2606 OID 41605)
-- Name: pagos_cuotas pagos_cuotas_cuotaId_fkey; Type: FK CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.pagos_cuotas
    ADD CONSTRAINT "pagos_cuotas_cuotaId_fkey" FOREIGN KEY ("cuotaId") REFERENCES tenant_001.cuotas(id) ON DELETE CASCADE;


--
-- TOC entry 5173 (class 2606 OID 41610)
-- Name: pagos_cuotas pagos_cuotas_pagoId_fkey; Type: FK CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.pagos_cuotas
    ADD CONSTRAINT "pagos_cuotas_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES tenant_001.pagos(id) ON DELETE CASCADE;


--
-- TOC entry 5171 (class 2606 OID 41615)
-- Name: pagos pagos_user_created_id_fkey; Type: FK CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.pagos
    ADD CONSTRAINT pagos_user_created_id_fkey FOREIGN KEY (user_created_id) REFERENCES tenant_001.usuarios(id);


--
-- TOC entry 5174 (class 2606 OID 41620)
-- Name: turnos turnos_caja_id_fkey; Type: FK CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.turnos
    ADD CONSTRAINT turnos_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES tenant_001.cajas(id);


--
-- TOC entry 5175 (class 2606 OID 41625)
-- Name: turnos turnos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: tenant_001; Owner: postgres
--

ALTER TABLE ONLY tenant_001.turnos
    ADD CONSTRAINT turnos_usuario_id_fkey FOREIGN KEY (usuario_open) REFERENCES tenant_001.usuarios(id);


-- Completed on 2026-05-26 02:15:10

--
-- PostgreSQL database dump complete
--

\unrestrict D24xfRGyaOag54LelwjAZYKCq6103cdIw4c0rQLcsBXXlBE8fdcqg7SQuJWQ2lZ

