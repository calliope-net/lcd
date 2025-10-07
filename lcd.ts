//% color=#001FCF icon="\uf26c" block="LCD" weight=18
namespace lcd
/*
Lutz Elßner, Freiberg, Oktober 2025, lutz@elssner.net
*/ {

    let q_display: eDisplay
    let q_i2c: number
    let q_rows: number
    let q_cols: number

    export enum eDisplay {
        //% block="kein Display"
        none,
        //% block="Grove LCD 16x2"
        grove_16_2,
        //% block="Qwiic LCD 16x2"
        qwiic_16_2,
        //% block="Qwiic LCD 20x4"
        qwiic_20_4
    }


    // ========== group="LCD Display"

    //% group="LCD Display"
    //% block="beim Start %display || I²C Check %i2c_check Reset %reset" weight=6
    //% i2c_check.shadow=toggleYesNo reset.shadow=toggleYesNo
    export function init_display(display: eDisplay, i2c_check?: boolean, reset?: boolean) {
        q_display = display
        if (q_display == eDisplay.grove_16_2) { q_i2c = 0x3E; q_rows = 2; q_cols = 16 }
        else if (q_display == eDisplay.qwiic_16_2) { q_i2c = 0x72; q_rows = 2; q_cols = 16 }
        else if (q_display == eDisplay.qwiic_20_4) { q_i2c = 0x72; q_rows = 4; q_cols = 20 }

        if (q_display == eDisplay.qwiic_16_2 || q_display == eDisplay.qwiic_20_4) {
            // LCD_DISPLAYON | LCD_CURSOROFF | LCD_BLINKOFF // 0x0C
            // set_display(true, false, false)
            if (i2c_check && !special_command(LCD_DISPLAYCONTROL + 0x04)) // Display on, Corsor off
                q_display = eDisplay.none

            // LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT // 0x06
            //entrymodeset(pADDR, eLCD_ENTRYMODE.LCD_ENTRYLEFT, eLCD_ENTRYSHIFT.LCD_ENTRYSHIFTDECREMENT)
            if (reset) {
                // RGB white
                //setBacklight(pADDR, 255, 255, 255)
                // CONTRAST_COMMAND
                setting_command_2(eSETTING_COMMAND_2.CONTRAST_COMMAND, 0)
            }
            clear_display()
        }

        else if (q_display == eDisplay.grove_16_2) {
            control.waitMicros(30000) // Power on + more than 15ms

            //write0x80Byte(0x38) // Function Set DL N
            if (i2c_check && !write0x80Byte(0x38)) // Display on, Cursor off
                q_display = eDisplay.none

            control.waitMicros(50) // >39µs
            //if (i2cNoError(pADDR)) {
            write0x80Byte(0x0C) // Display ON, Cursor OFF
            control.waitMicros(50) // >39µs
            write0x80Byte(0x01) // Screen Clear
            control.waitMicros(1600) // > 1.53ms
            write0x80Byte(0x06) // Increment Mode
            control.waitMicros(50) // >39µs
            //}
            //control.waitMicros(30000)
        }
    }

    export enum eLCD_CLEARDISPLAY {
        //% block="Display löschen"
        LCD_CLEARDISPLAY = 0x01,
        //% block="Cursor Home"
        LCD_RETURNHOME = 0x02
    }

    //% group="LCD Display"
    //% block="Display löschen" weight=5
    export function clear_display() {
        if (q_display == eDisplay.qwiic_16_2 || q_display == eDisplay.qwiic_20_4) {
            special_command(eLCD_CLEARDISPLAY.LCD_CLEARDISPLAY)
            set_cursor(0, 0)
        }
        else if (q_display == eDisplay.grove_16_2) {
            write0x80Byte(0x01)
            control.waitMicros(1600)
        }
    }

    //% group="LCD Display"
    //% block="Display %display Cursor %cursor || Blink %blink" weight=2
    //% display.defl=true blink.defl=false
    //% display.shadow=toggleOnOff cursor.shadow=toggleOnOff blink.shadow=toggleOnOff
    //% inlineInputMode=inline
    export function set_display(display: boolean, cursor: boolean, blink?: boolean) {
        if (q_display != eDisplay.none) {
            let command: number = LCD_DISPLAYCONTROL // 0x08
            if (display) { command += 0x04 }
            if (cursor) { command += 0x02 }
            if (blink) { command += 0x01 }

            special_command(command)
        }
        //else return false
    }



    // ========== group="Text anzeigen"

    export enum eAlign {
        //% block="linksbündig"
        left,
        //% block="rechtsbündig"
        right
    }

    //% group="Text anzeigen"
    //% block="Text Zeile %row von %col bis %end %value || %align" weight=7
    //% row.min=0 row.max=3 col.min=0 col.max=19 end.min=0 end.max=19 end.defl=15
    //% value.shadow=lcd_text
    //% align.defl=0
    //% inlineInputMode=inline
    export function write_text(row: number, col: number, end: number, value: any, align?: eAlign) {
        if (q_display != eDisplay.none) {
            let text: string = convertToText(value)
            if (end > q_cols - 1) { end = q_cols - 1 }
            let len: number = end - col + 1

            if (between(row, 0, q_rows - 1) && between(col, 0, q_cols - 1) && between(len, 0, q_cols)) {
                set_cursor(row, col)

                if (text.length > len)
                    text = text.substr(0, len)
                else if (text.length < len && align == eAlign.right)
                    text = "                    ".substr(0, len - text.length) + text
                else if (text.length < len)
                    text = text + "                    ".substr(0, len - text.length)
                /*
                let bu: Buffer
                if (q_display == eDisplay.qwiic_16_2 || q_display == eDisplay.qwiic_20_4) {
                    text = text.replace("|", "||")
                    bu = Buffer.create(text.length)
                    for (let i = 0; i < text.length; i++) {
                        bu.setUint8(i, change_char_code(text, i))
                    }
                }
                else if (q_display == eDisplay.grove_16_2) {
                    bu = Buffer.create(text.length + 1)
                    bu.setUint8(0, 0x40)
                    for (let i = 0; i <= text.length - 1; i++) {
                        bu.setUint8(i + 1, change_char_code(text, i))
                    }
                }
                */
                i2c_write_buffer(write_text_to_buffer(text))
                basic.pause(10) // sleep(0.01)
            }
        }
    }

    function write_text_to_buffer(text: string) {
        let buffer: Buffer
        if (q_display == eDisplay.qwiic_16_2 || q_display == eDisplay.qwiic_20_4) {
            text = text.replace("|", "||")
            buffer = Buffer.create(text.length)
            for (let i = 0; i < text.length; i++) {
                buffer.setUint8(i, change_char_code(text, i))
            }
        }
        else if (q_display == eDisplay.grove_16_2) {
            buffer = Buffer.create(text.length + 1)
            buffer.setUint8(0, 0x40)
            for (let i = 0; i <= text.length - 1; i++) {
                buffer.setUint8(i + 1, change_char_code(text, i))
            }
        }
        return buffer
    }


    //% group="Text anzeigen"
    //% block="Cursor Zeile %row von %col" weight=3
    //% row.min=0 row.max=3 col.min=0 col.max=19
    export function set_cursor(row: number, col: number) {
        if (between(row, 0, q_rows - 1) && between(col, 0, q_cols - 1)) {
            special_command(LCD_SETDDRAMADDR | ([0x00, 0x40, 0x14, 0x54].get(row) + col)) // max. 7 Bit (127)
        }
    }

    //% group="Text anzeigen"
    //% block="Text %value" weight=2
    //% value.shadow=lcd_text
    export function write_lcd(value: any) {
        if (q_display != eDisplay.none) {
            let text: string = convertToText(value)
            if (q_display == eDisplay.qwiic_16_2 || q_display == eDisplay.qwiic_20_4)
                text = text.replace("|", "||")

            let buffer = write_text_to_buffer(text)

            if (q_display == eDisplay.qwiic_16_2 || q_display == eDisplay.qwiic_20_4) {
                // 22.09.2025 Qwiic LCD Display erlaubt nur max 32 Byte pro Buffer; für 80 Zeichen teilen in 3 Buffer 3*27 = 81
                // Zeichen werden auf nächster Zeile weiter geschrieben, nach Ende des Displays Fortsetzung auf erster Zeile
                let bu_list = buffer.chunked(27) // Splits buffer into parts no longer than 27
                for (let i = 0; i < bu_list.length; i++) {
                    i2c_write_buffer(bu_list[i])
                    basic.pause(10) // sleep(0.01)
                }
            }
            else if (q_display == eDisplay.grove_16_2) {
                i2c_write_buffer(buffer)
                basic.pause(10) // sleep(0.01)
            }
        }
    }

    let q_list_index = 0
    let q_string_index = 0

    export enum eINC {
        //% block="+0"
        inc0 = 0,
        //% block="+1"
        inc1 = 1
    }

    //% group="Text Array"
    //% block="Text Array %text_list %increment || Index %list_index Substring %string_index" weight=2
    //% increment.shadow=toggleYesNo
    //% inlineInputMode=inline
    export function write_array(text_list: string[], increment: eINC, list_index?: number, string_index?: number) {
        // zeigt 60 Zeichen aus text_list an und schaltet weiter
        let zeichen: number

        if (q_display != eDisplay.none && text_list.length > 0) {
            if (q_display == eDisplay.qwiic_20_4)
                zeichen = 60
            else if (q_display == eDisplay.qwiic_16_2 || q_display == eDisplay.grove_16_2)
                zeichen = 16

            if (list_index !== undefined) { q_list_index = list_index }
            if (string_index !== undefined) { q_string_index = string_index }
            if (!between(q_list_index, 0, text_list.length - 1)) { q_list_index = 0 }
            let text: string = text_list[q_list_index]
            if (!between(q_string_index, 0, text.length - 1)) { q_string_index = 0 }

            let text_substr = text.substr(q_string_index, zeichen)

            clear_display()
            // Zeile 0 text_list_index, text_substr_index, text_length(gesamt)
            write_text(0, null, q_cols - 1,
                q_list_index + "/" + text_list.length + " " + q_string_index + "-" + (q_string_index + Math.min(59, text_substr.length - 1)) + "/" + text.length)

            // Zeile 1-2-3 60 Zeichen von text = 3 Zeilen x 20 Zeichen
            // Zeile 1 16 Zeichen von text = 1 Zeilen x 16 Zeichen
            set_cursor(1, 0)
            write_lcd(text_substr)

            if (increment == eINC.inc1) {
                if (text.length > q_string_index + zeichen) {
                    q_string_index += zeichen // 60 oder 16
                }
                else if (text_list.length - 1 > q_list_index) {
                    q_list_index += 1  // nächstes Element im String-Array
                    q_string_index = 0 // String auf Anfang
                }
                else {
                    q_list_index = 0
                    q_string_index = 0
                }
            }
        }
    }




    // ========== group="Konfiguration"

    //% group="Konfiguration"
    //% block="%display" weight=2
    export function get_display(display: eDisplay) { return display == q_display }



    // ========== private

    export enum eSETTING_COMMAND_2 {    // SETTING_COMMAND + 2 Byte
        CONTRAST_COMMAND = 0x18,        // SETTING_COMMAND, CONTRAST_COMMAND, value
        ADDRESS_COMMAND = 0x19,         // SETTING_COMMAND, ADDRESS_COMMAND, value
    }
    export function setting_command_2(command: eSETTING_COMMAND_2, byte: number) {
        /*
            # To set the contrast we need to send 3 bytes:
            # (1) SETTINGS_COMMAND
            # (2) CONTRAST_COMMAND
            # (3) contrast value
            #
            # To do this, we are going to use writeBlock(),
            # so we need our "block of bytes" to include
            # CONTRAST_COMMAND and contrast value
        */
        if (q_display != eDisplay.none) {
            i2c_write_buffer(Buffer.fromArray([SETTING_COMMAND, command, byte & 0xFF]))
            basic.pause(50) // sleep(0.05)
        }
    }

    //% blockId=lcd_text block="%s" blockHidden=true
    export function lcd_text(s: string): string { return s }

    // Qwiic 0xFE = 254
    function special_command(command: number) { return i2c_write_buffer(Buffer.fromArray([SPECIAL_COMMAND, command & 0xFF])) }

    // Grove 0x80 = 128
    function write0x80Byte(command: number) { return i2c_write_buffer(Buffer.fromArray([0x80, command])) }

    //function sleep(sekunden: number) { basic.pause(sekunden * 1000) }

    function between(i0: number, i1: number, i2: number): boolean { return (i0 >= i1 && i0 <= i2) }

    function i2c_write_buffer(buffer: Buffer) {
        if (q_display != eDisplay.none)
            return pins.i2cWriteBuffer(q_i2c, buffer) == 0
        else
            return false
        /*  if (n_i2cError == 0) { // vorher kein Fehler
             n_i2cError = pins.i2cWriteBuffer(pADDR, buf, repeat)
             if (n_i2cCheck && n_i2cError != 0)  // vorher kein Fehler, wenn (n_i2cCheck=true): beim 1. Fehler anzeigen
                 basic.showString(Buffer.fromArray([pADDR]).toHex()) // zeige fehlerhafte i2c-Adresse als HEX
         } else if (!n_i2cCheck)  // vorher Fehler, aber ignorieren (n_i2cCheck=false): i2c weiter versuchen
             n_i2cError = pins.i2cWriteBuffer(pADDR, buf, repeat)
         //else { } // n_i2cCheck=true und n_i2cError != 0: weitere i2c Aufrufe blockieren
          */
    }


    function change_char_code(text: string, i: number) {
        //let char = text.charAt(i)
        //if (char.length == 0) return 0
        switch (text.charCodeAt(i)) {
            case SPECIAL_COMMAND: return 0xD8 // 0xFE im Text wirkt als Command, auch
            //case SETTING_COMMAND: return 0xC9 // '|'  wenn es nicht am Anfang im Buffer steht
            case 0x0D: return 0xA2 // CR durch druckbares Zeichen aus LCD Font-Table ersetzen
            case 0x0A: return 0xA3 // LF
            case 0xFF: return 0xF3 // EOF
            case 0x00: return 0xF2 // NUL
            case 0x80: return 0xE3 // € kann verschiedene Codierungen haben
        }
        switch (text.charAt(i)) { // case "ä", "Ä" mit Komma trennen funktioniert nicht
            case "ß": return 0xE2
            case "ä": return 0xE1
            case "ö": return 0xEF
            case "ü": return 0xF5
            case "Ä": return 0xE1
            case "Ö": return 0xEF
            case "Ü": return 0xF5
            case "€": return 0xE3 // € funktioniert nicht
            case "µ": return 0xE4
            case "°": return 0xDF
        }
        return text.charCodeAt(i) & 0xFF // es können nur 1 Byte Zeichen-Codes im Buffer übertragen werden
    }

    // Qwiic
    // OpenLCD command characters
    const SPECIAL_COMMAND = 254  // Magic number for sending a special command
    const SETTING_COMMAND = 0x7C // 124, |, the pipe character: The command to change settings: baud, lines, width, backlight, splash, etc

    // special commands
    // const LCD_CLEARDISPLAY = 0x01   // im Beispiel Py nicht benutzt, stattdessen CLEAR_COMMAND = 0x2D
    // const LCD_RETURNHOME = 0x02     // SPECIAL_COMMAND, LCD_RETURNHOME (1 Byte)
    // Flags
    const LCD_ENTRYMODESET = 0x04   // SPECIAL_COMMAND, LCD_ENTRYMODESET | Flags
    const LCD_DISPLAYCONTROL = 0x08 // SPECIAL_COMMAND, LCD_DISPLAYCONTROL | Flags
    const LCD_CURSORSHIFT = 0x10    // SPECIAL_COMMAND, LCD_CURSORSHIFT | Flags
    //    LCD_FUNCTIONSET = 0x20    nicht benutzt
    //    LCD_SETCGRAMADDR = 0x40   nicht benutzt
    // set Cursor
    const LCD_SETDDRAMADDR = 0x80   // SPECIAL_COMMAND, LCD_SETDDRAMADDR | (col + row_offsets[row])



    // Grove


} // lcd.ts